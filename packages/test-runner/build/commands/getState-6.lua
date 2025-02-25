--[[
  Get a job state

  Input: 
    KEYS[1] 'completed' key,
    KEYS[2] 'failed' key
    KEYS[3] 'delayed' key
    KEYS[4] 'active' key
    KEYS[5] 'wait' key
    KEYS[6] 'paused' key

    ARGV[1] job id
  Output:
    'completed'
    'failed'
    'delayed'
    'active'
    'waiting'
    'unknown'
]]
if redis.call("ZSCORE", KEYS[1], ARGV[1]) ~= false then
  return "completed"
end

if redis.call("ZSCORE", KEYS[2], ARGV[1]) ~= false then
  return "failed"
end

if redis.call("ZSCORE", KEYS[3], ARGV[1]) ~= false then
  return "delayed"
end

local function item_in_list (list, item)
  for _, v in pairs(list) do
    if v == item then
      return 1
    end
  end
  return nil
end

local active_items = redis.call("LRANGE", KEYS[4] , 0, -1)
if item_in_list(active_items, ARGV[1]) ~= nil then
  return "active"
end

local wait_items = redis.call("LRANGE", KEYS[5] , 0, -1)
if item_in_list(wait_items, ARGV[1]) ~= nil then
  return "waiting"
end

local paused_items = redis.call("LRANGE", KEYS[6] , 0, -1)
if item_in_list(paused_items, ARGV[1]) ~= nil then
  return "waiting"
end

return "unknown"
