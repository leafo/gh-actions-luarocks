
const core = require("@actions/core")
const exec = require("@actions/exec")
const io = require("@actions/io")
const tc = require("@actions/tool-cache")

const path = require("path")

const BUILD_PREFIX = ".build-luarocks"

const LUA_PREFIX = ".lua" // default location for existing Lua installation
const LUAROCKS_PREFIX = ".luarocks" // default location for LuaRocks installation

async function main() {
  const luaRocksVersion = core.getInput('luaRocksVersion', { required: true })

  const luaRocksExtractPath = path.join(process.env["RUNNER_TEMP"], BUILD_PREFIX, `luarocks-${luaRocksVersion}`)
  const luaRocksInstallPath = path.join(process.cwd(), LUAROCKS_PREFIX)

  const sourceTar = await tc.downloadTool(`https://luarocks.org/releases/luarocks-${luaRocksVersion}.tar.gz`)
  await io.mkdirP(luaRocksExtractPath)
  await tc.extractTar(sourceTar, path.join(process.env["RUNNER_TEMP"], BUILD_PREFIX))

  const configureArgs = []
  if (core.getInput("withLuaPath")) {
    configureArgs.push(`--with-lua="${core.getInput("withLuaPath")}"`)
  } else {
    // NOTE: this is the default install path provided by gh-actions-lua
    const luaInstallPath = path.join(process.cwd(), LUA_PREFIX)
    configureArgs.push(`--with-lua="${luaInstallPath}"`)
  }

  configureArgs.push(`--prefix="${luaRocksInstallPath}"`)

  await exec.exec(`./configure ${configureArgs.join(" ")}`, undefined, {
    cwd: luaRocksExtractPath
  })

  await exec.exec("make", undefined, {
    cwd: luaRocksExtractPath
  })

  // NOTE: make build step is only necessary for luarocks 2.x
  if (luaRocksVersion.match(/^2\./)) {
    await exec.exec("make build", undefined, {
      cwd: luaRocksExtractPath
    })
  }

  await exec.exec("make install", undefined, {
    cwd: luaRocksExtractPath
  })

  // Update environment to use luarocks directly
  let lrPath = ""

  await exec.exec(`${path.join(luaRocksInstallPath, "bin", "luarocks")} path --lr-bin`, undefined, {
    listeners: {
      stdout: (data) => {
        lrPath += data.toString()
      }
    }
  })

  if (lrPath != "") {
    core.addPath(lrPath.trim());
  }

  let luaPath = ""

  await exec.exec("luarocks path --lr-path", undefined, {
    listeners: {
      stdout: (data) => {
        luaPath += data.toString()
      }
    }
  })

  luaPath = luaPath.trim()

  let luaCpath = ""

  await exec.exec("luarocks path --lr-cpath", undefined, {
    listeners: {
      stdout: (data) => {
        luaCpath += data.toString()
      }
    }
  })

  luaCpath = luaCpath.trim()

  if (luaPath != "") {
    core.exportVariable("LUA_PATH", ";;" + luaPath)
  }

  if (luaCpath != "") {
    core.exportVariable("LUA_CPATH", ";;" + luaCpath)
  }
}

main().catch(err => {
  core.setFailed(`Failed to install LuaRocks: ${err}`);
})

