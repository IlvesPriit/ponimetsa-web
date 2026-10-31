import { pool } from "@/lib/db";

export type PortalRider = {
  id: string;
  display_name: string;
  level_label: string;
  relationship: string;
  weekly_sessions: number | null;
};

export type PortalMembership = {
  rider_id: string;
  group_name: string;
  weekday: number;
  start_time: string;
};

export type PortalBooking = {
  id: string;
  rider_id: string;
  title: string;
  starts_at: string | Date;
  status: string;
  booking_kind: string;
  horse_name: string | null;
};

export type PortalCredit = {
  id: string;
  rider_id: string;
  state: string;
  expires_at: string | Date;
};

export type PortalWaitlist = {
  id: string;
  rider_id: string;
  title: string;
  starts_at: string | Date;
  status: string;
  offer_expires_at: string | Date | null;
};

export type TrainingPortalData = {
  viewerName: string;
  viewerEmail: string | null;
  perspective: "contact" | "rider";
  riders: PortalRider[];
  memberships: PortalMembership[];
  bookings: PortalBooking[];
  credits: PortalCredit[];
  waitlist: PortalWaitlist[];
};

type ContactRow = { id: string; legal_name: string; email: string | null };
type RiderBaseRow = {
  id: string;
  display_name: string;
  level_label: string;
  relationship: string;
};

async function loadPortalDetails(
  viewerName: string,
  viewerEmail: string | null,
  perspective: "contact" | "rider",
  baseRiders: RiderBaseRow[]
): Promise<TrainingPortalData> {
  const riderIds = baseRiders.map((rider) => rider.id);
  if (!riderIds.length) {
    return { viewerName, viewerEmail, perspective, riders: [], memberships: [], bookings: [], credits: [], waitlist: [] };
  }

  const [termRes, membershipRes, bookingRes, creditRes, waitlistRes] = await Promise.all([
    pool.query<{ rider_id: string; weekly_sessions: number | null }>(
      `select distinct on (cm.rider_id) cm.rider_id, t.weekly_sessions
       from public.rider_contract_members cm
       join public.rider_contracts c on c.id = cm.contract_id and c.active = true
       join public.rider_contract_terms t on t.contract_id = c.id and t.effective_from <= current_date
       where cm.rider_id = any($1::uuid[])
       order by cm.rider_id, t.effective_from desc`,
      [riderIds]
    ),
    pool.query<PortalMembership>(
      `select m.rider_id, g.name as group_name, s.weekday,
              to_char(s.start_time, 'HH24:MI') as start_time
       from public.training_group_memberships m
       join public.training_group_slots s on s.id = m.slot_id and s.active = true
       join public.training_groups g on g.id = s.group_id and g.active = true
       where m.rider_id = any($1::uuid[]) and m.status = 'active'
       order by s.weekday, s.start_time`,
      [riderIds]
    ),
    pool.query<PortalBooking>(
      `select b.id, b.rider_id, ts.title, ts.starts_at, b.status, b.booking_kind,
              h.name as horse_name
       from public.training_bookings b
       join public.training_sessions ts on ts.id = b.session_id
       left join public.training_horse_assignments ha
         on ha.session_id = ts.id and ha.rider_id = b.rider_id and ha.state = 'published'
       left join public.horses h on h.id = ha.horse_id
       where b.rider_id = any($1::uuid[])
         and ts.starts_at >= now() - interval '1 day'
         and b.status not in ('cancelled_on_time', 'cancelled_late')
       order by ts.starts_at limit 100`,
      [riderIds]
    ),
    pool.query<PortalCredit>(
      `select id, rider_id, state, expires_at
       from public.training_credits
       where rider_id = any($1::uuid[]) and state in ('available', 'reserved') and expires_at > now()
       order by expires_at`,
      [riderIds]
    ),
    pool.query<PortalWaitlist>(
      `select w.id, w.rider_id, ts.title, ts.starts_at, w.status,
              o.expires_at as offer_expires_at
       from public.training_waitlist_entries w
       join public.training_sessions ts on ts.id = w.session_id
       left join lateral (
         select expires_at from public.training_waitlist_offers
         where waitlist_entry_id = w.id and response is null
         order by offered_at desc limit 1
       ) o on true
       where w.rider_id = any($1::uuid[])
         and w.status in ('waiting', 'offered')
         and ts.starts_at >= now()
       order by ts.starts_at`,
      [riderIds]
    ),
  ]);

  const weeklyByRider = new Map(termRes.rows.map((row) => [row.rider_id, row.weekly_sessions]));
  const riders = baseRiders.map((rider) => ({
    ...rider,
    weekly_sessions: weeklyByRider.get(rider.id) ?? null,
  }));

  return {
    viewerName,
    viewerEmail,
    perspective,
    riders,
    memberships: membershipRes.rows,
    bookings: bookingRes.rows,
    credits: creditRes.rows,
    waitlist: waitlistRes.rows,
  };
}

export async function loadPortalForContact(contactId: string): Promise<TrainingPortalData | null> {
  const contactRes = await pool.query<ContactRow>(
    `select id, legal_name, email from public.rider_contacts where id = $1 and active = true`,
    [contactId]
  );
  const contact = contactRes.rows[0];
  if (!contact) return null;

  const riderRes = await pool.query<RiderBaseRow>(
    `select r.id, r.display_name, l.label as level_label, links.relationship
     from public.rider_contact_links links
     join public.riders r on r.id = links.rider_id and r.active = true
     join public.training_levels l on l.id = r.level_id
     where links.contact_id = $1
     order by r.display_name`,
    [contactId]
  );
  return loadPortalDetails(contact.legal_name, contact.email, "contact", riderRes.rows);
}

export async function loadPortalForRider(riderId: string): Promise<TrainingPortalData | null> {
  const riderRes = await pool.query<RiderBaseRow>(
    `select r.id, r.display_name, l.label as level_label, 'self'::text as relationship
     from public.riders r
     join public.training_levels l on l.id = r.level_id
     where r.id = $1 and r.active = true`,
    [riderId]
  );
  const rider = riderRes.rows[0];
  if (!rider) return null;
  return loadPortalDetails(rider.display_name, null, "rider", [rider]);
}

export async function findContactForAuthUser(userId: string, email: string | null) {
  const contactRes = await pool.query<ContactRow>(
    `select id, legal_name, email
     from public.rider_contacts
     where active = true
       and (auth_user_id = $1 or ($2::text is not null and lower(email) = lower($2)))
     order by case when auth_user_id = $1 then 0 else 1 end
     limit 1`,
    [userId, email]
  );
  return contactRes.rows[0] ?? null;
}
