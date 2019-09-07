# Github Action for LuaRocks

### `leafo/gh-actions-luarocks`

[![Actions Status](https://github.com/leafo/gh-actions-luarocks/workflows/test/badge.svg)](https://github.com/leafo/gh-actions-luarocks/actions)

Builds and installs LuaRocks from source into the `.luarocks/` directory in the working directory. Configures `PATH`, `LUA_PATH`, and `LUA_CPATH` environment variables to be able to use the `luarocks` command directly in workflows.

[`leafo/gh-actions-lua`](https://github.com/leafo/gh-actions-lua/tree/master/install-lua) can be used to install Lua, which is required for LuaRocks to build and run. (This action will use any Lua installed in `.lua/`).

## Usage

Installs Lua, LuaRocks, then install a module:

```yaml
- uses: leafo/gh-actions-lua@v2
- uses: leafo/gh-actions-luarocks@v2

# Install some package
- name: install a module
  run: luarocks install moonscript
```

For a more complete exmpale see: https://github.com/leafo/gh-actions-lua/blob/master/README.md#full-example

## Inputs

### `luarocksVersion`

**Default**: `"3.2.0"`

Specifies which version of LuaRocks to install. Must be listed on https://luarocks.github.io/luarocks/releases/

Example:

```yaml
- uses: leafo/gh-actions-luarocks@v2
  with:
    luarocksVersion: "3.1.3"
```
