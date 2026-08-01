#!/usr/bin/env bash
# Regression gate — run manually before pushing (docs/REFACTOR_PLAN.md §5.2).
# One stage per line, fail-fast, so it can be lifted verbatim into a CI
# workflow if a second developer joins and PRs begin.
#
# Usage: ./verify.sh [--dist] [--db]
#   --dist  also build and assert the public entry chunk ships no admin code
#   --db    also run the db tier against the local Supabase stack
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

if [ "$RUN_DB" = 1 ]; then
    # Placeholder until the db tier lands with apply_config
    # (REFACTOR_PLAN Phase 5): RLS matrix, RPC atomicity, migration reset.
    echo "── db tests"
    echo "· SKIP  db tier not implemented yet (REFACTOR_PLAN Phase 5)"
fi

if [ "$RUN_DIST" = 1 ]; then
    stage "dist" check_dist
fi

echo "All stages passed."
