
import * as core from "@actions/core"
import * as exec from "@actions/exec"
import * as io from "@actions/io"
import * as tc from "@actions/tool-cache"

import crypto from "crypto"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const BUILD_PREFIX = ".build-luarocks"

const LUA_PREFIX = ".lua" // default location for existing Lua installation
const LUAROCKS_PREFIX = ".luarocks" // default location for LuaRocks installation

// Resolve sibling files (known-checksums.json) relative to this script rather
// than process.cwd(), since the action runs from the consumer's repo root.
const __dirname = path.dirname(fileURLToPath(import.meta.url))

function loadKnownChecksums() {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, "known-checksums.json"), "utf8"))
  return data.tarballSha256 || {}
}

async function sha256OfFile(filePath) {
  return await new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256")
    const stream = fs.createReadStream(filePath)
    stream.on("data", chunk => hash.update(chunk))
    stream.on("end", () => resolve(hash.digest("hex")))
    stream.on("error", reject)
  })
}

async function verifyTarball(tarballPath, version) {
  const known = loadKnownChecksums()
  const expected = known[version]
  if (!expected) {
    throw new Error(
      `LuaRocks ${version} is not in this action's known-checksums.json — ` +
      `the downloaded tarball cannot be verified. ` +
      `Either pin luaRocksVersion to a known release ` +
      `(${Object.keys(known).sort().reverse().join(", ")}) ` +
      `or open a PR to add the SHA256 of luarocks-${version}.tar.gz to known-checksums.json.`
    )
  }
  const actual = await sha256OfFile(tarballPath)
  if (actual !== expected) {
    throw new Error(
      `SHA256 mismatch for luarocks-${version}.tar.gz: ` +
      `expected ${expected}, got ${actual}. ` +
      `The download from luarocks.org does not match the checksum recorded in this action — ` +
      `aborting to avoid running unverified code.`
    )
  }
  core.info(`Verified luarocks-${version}.tar.gz SHA256 ${actual}`)
}

async function main() {
  const luaRocksVersion = core.getInput('luaRocksVersion', { required: true })

  const luaRocksExtractPath = path.join(process.env["RUNNER_TEMP"], BUILD_PREFIX, `luarocks-${luaRocksVersion}`)
  const luaRocksInstallPath = path.join(process.cwd(), LUAROCKS_PREFIX)

  const sourceTar = await tc.downloadTool(`https://luarocks.org/releases/luarocks-${luaRocksVersion}.tar.gz`)
  await verifyTarball(sourceTar, luaRocksVersion)
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

