# Github Action for LuaRocks

### `leafo/gh-actions-luarocks`

[![Actions Status](https://github.com/leafo/gh-actions-luarocks/workflows/test/badge.svg)](https://github.com/leafo/gh-actions-luarocks/actions)

Builds and installs LuaRocks from source into the `.luarocks/` directory in the working directory. Configures `PATH`, `LUA_PATH`, and `LUA_CPATH` environment variables to be able to use the `luarocks` command directly in workflows, and require installed modules in Lua.

[`leafo/gh-actions-lua`](https://github.com/marketplace/actions/install-lua-luajit) can be used to install Lua, which is required for LuaRocks to build and run. (This action will use any Lua installed in `.lua/`).

## Usage

Installs Lua, LuaRocks, then install a module:

```yaml
- uses: leafo/gh-actions-lua@v13
- uses: leafo/gh-actions-luarocks@v6

# Install some package
- name: install a module
  run: luarocks install moonscript
```

For a more complete example see: https://github.com/leafo/gh-actions-lua/blob/master/README.md#full-example

## Inputs

### `luaRocksVersion`

**Default**: `"3.13.0"`

Specifies which version of LuaRocks to install. Must be listed in [`known-checksums.json`](./known-checksums.json) — the action verifies the downloaded source tarball against the SHA256 recorded there before building. To request a new version, open a PR adding the `sha256sum` of `luarocks-<version>.tar.gz` to that file.

Example:

```yaml
- uses: leafo/gh-actions-luarocks@v6
  with:
    luaRocksVersion: "3.13.0"
```

### `withLuaPath`

**Default**: `null` (Optional)

Manually specify the path to an existing Lua installation to use. This is not
necessary if you are using `leafo/gh-actions-lua`. Will build LuaRocks with
`./configure --with-lua=$withLuaPath`

Example:

```yaml
- uses: leafo/gh-actions-luarocks@v6
  with:
    withLuaPath: "/usr/local/openresty/luajit/"
```
