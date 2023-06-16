#!/usr/bin/env node

import process from 'node:process'
import chalk from 'chalk'
import minimist from 'minimist'
import {createHost} from './host.js'
import {runTask} from './task.js'
import {Response} from './ssh.js'

import './recipe/common.js'
import {exec} from './utils.js'

await async function main() {
  const argv = minimist(process.argv.slice(2), {
    boolean: ['verbose', 'multiplexing'],
    default: {
      verbose: false,
      multiplexing: !exec.ssh('-V').includes('_for_Windows'),
    }
  })

  const remoteUserAndHostname = argv._[0]
  let remoteUser, hostname, become
  if (remoteUserAndHostname.includes('@')) {
    [remoteUser, hostname] = remoteUserAndHostname.split('@', 2)
  } else {
    hostname = remoteUserAndHostname
    if (hostname.endsWith('.compute.amazonaws.com')) {
      remoteUser = 'ubuntu'
    }
  }
  if (hostname.endsWith('.compute.amazonaws.com') && remoteUser == 'ubuntu') {
    become = 'root'
  }

  const context = createHost({
    remoteUser,
    hostname,
    become,
    ...argv,
  })
  await runTask('provision', context)
  context.config.become = 'webpod'
  await runTask('deploy', context)

}().catch(handleError)

function handleError(error: any) {
  if (error instanceof Response) {
    console.error(
      `\nThe following command failed with exit code ${chalk.red(error.exitCode)}:\n\n` +
      `  ` + chalk.bgRedBright.white(`$ ${error.command}`) + `\n\n` +
      error.stderr,
      error.stdout
    )
    process.exitCode = 1
  } else {
    throw error
  }
}
