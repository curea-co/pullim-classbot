# pullim-classbot — standard verbs. `just` to list.
set shell := ["bash", "-cu"]

default:
    @just --list

dev:
    bun run dev

build:
    bun run build

test:
    bun run test

lint:
    bun run lint

typecheck:
    bun run typecheck

check:
    bun run lint
    bun run typecheck
    bun run test

setup:
    mise install
    bun install

ship msg:
    just check
    git add -A
    git commit -m "{{msg}}"
    git push
