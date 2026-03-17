ALTER TABLE quests DROP CONSTRAINT quests_reward_sol_check;
ALTER TABLE quests ADD CONSTRAINT quests_reward_sol_check CHECK (reward_sol >= 0.01);