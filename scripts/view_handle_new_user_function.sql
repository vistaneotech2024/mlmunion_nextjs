-- SQL Commands to View the handle_new_user() Function
-- Run these commands in Supabase SQL Editor to see the function definition

-- Method 1: Get full function definition (Recommended)
SELECT pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'handle_new_user'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Method 2: View function details from information_schema
SELECT 
    routine_name,
    routine_type,
    routine_definition,
    data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'handle_new_user';

-- Method 3: View function signature and details from pg_proc
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type,
    l.lanname as language,
    p.prosecdef as security_definer,
    p.prosrc as source_code
FROM pg_proc p
JOIN pg_language l ON p.prolang = l.oid
WHERE p.proname = 'handle_new_user'
  AND p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Method 4: View the trigger that uses this function
SELECT 
    t.tgname as trigger_name,
    t.tgenabled as enabled,
    c.relname as table_name,
    p.proname as function_name,
    pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE p.proname = 'handle_new_user'
  AND NOT t.tgisinternal;

















