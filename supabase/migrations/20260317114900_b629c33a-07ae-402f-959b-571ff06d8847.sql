
-- agent_messages already in realtime, just add notifications
-- This is a no-op migration to fix the previous partial failure
-- The notifications table and policies were already created above
SELECT 1;
