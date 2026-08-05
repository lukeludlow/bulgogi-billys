#!/usr/bin/env bash
# Regression gate — run manually before pushing (docs/REFACTOR_PLAN.md §5.2).
# One stage per line, fail-fast, so it can be lifted verbatim into a CI
# workflow if a second developer joins and PRs begin.
#
# Usage: ./verify.sh [--dist] [--db]
#   --dist  also build and assert the public entry chunk ships no admin code
#   --db    also run the db tier against the local Supabase stack. DESTRUCTIVE:
#           it resets the local database (which is what proves the migration
#           chain applies from scratch) and each test file reseeds it.
set -u
cd "$(dirname "$0")"

RUN_DIST=0
RUN_DB=0
for arg in "$@"; do
    case "$arg" in
        --dist) RUN_DIST=1 ;;
        --db) RUN_DB=1 ;;
        *)
            echo "unknown flag: $arg (usage: ./verify.sh [--dist] [--db])"
            exit 2
            ;;
    esac
done

stage() {
    local name="$1"
    shift
    echo "── ${name}"
    if "$@"; then
        echo "✔ PASS  ${name}"
    else
        echo "✘ FAIL  ${name}"
        exit 1
    fi
}

check_dist() {
    npm run build || return 1
    local entry
    entry=$(echo dist/assets/index-*.js)
    [ -f "$entry" ] || {
        echo "no dist/assets/index-*.js entry chunk found"
        return 1
    }
    # Match library *code*, not chunk filenames — the entry's lazy-load map
    # legitimately names the supabase chunk file. GoTrueClient only appears
    # inside supabase-js; CartesianGrid only inside recharts.
    local marker
    for marker in GoTrueClient CartesianGrid; do
        if grep -q "$marker" "$entry"; then
            echo "public entry chunk contains admin-only code marker '$marker'"
            return 1
        fi
    done
    echo "public entry chunk is free of supabase-js/recharts code"
}

stage "lint" npx eslint .
stage "format" npx prettier --check .
stage "typecheck" npx tsc -b
stage "unit tests" npx vitest run --project unit
stage "browser tests" npx vitest run --project browser

check_db_stack() {
    if npx supabase status >/dev/null 2>&1; then
        echo "local Supabase stack is up"
    else
        echo "the db tier needs the local stack: npx supabase start"
        return 1
    fi
}

db_reset() {
    npx supabase db reset || return 1
    # `db reset` restarts several containers, and Kong goes on routing to the
    # addresses they had before — every /auth/v1 call 502s until Kong restarts
    # too. The db tier waits for GoTrue to answer, so no sleep is needed here.
    local project
    project=$(sed -n 's/^project_id[[:space:]]*=[[:space:]]*"\(.*\)"/\1/p' \
        supabase/config.toml)
    [ -n "$project" ] || {
        echo "no project_id in supabase/config.toml"
        return 1
    }
    docker restart "supabase_kong_${project}" >/dev/null
}

if [ "$RUN_DB" = 1 ]; then
    stage "db stack" check_db_stack
    # Doubles as §5.3's migration check: the whole chain must apply from
    # scratch, and everything downstream runs against what it produced.
    stage "db reset" db_reset
    stage "db tests" npx vitest run --project db
fi

if [ "$RUN_DIST" = 1 ]; then
    stage "dist" check_dist
fi

echo "All stages passed."
