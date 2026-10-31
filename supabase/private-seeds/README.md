# Private training seeds

This directory is for local SQL seeds containing rider and parent personal data.
The SQL files are ignored by Git and must not be committed.

Apply the public migration first. Only then may an authorised administrator apply
the private seed to the intended Supabase project. Review inferred group
memberships before changing them from `suggested` to `active`.
