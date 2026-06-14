### Added

### Changed

### Fixed
- Added prominent warnings to `update_db.sql` and `supabase_push_setup.sql` to ensure the user replaces the `YOUR_PROJECT_REF` and `YOUR_ANON_KEY` placeholders in the pg_cron schedule, as failing to do so causes the automated sober push notifications to silently fail.


### Removed
