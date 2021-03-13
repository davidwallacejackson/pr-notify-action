function logInternal(level: 'DEBUG' | 'INFO' | 'ERROR', data: any) {
  // would put this in config, but needs to be available synchronously
  if (process.env['PR_NOTIFY_DISABLE_LOGGING'] !== '') {
    return
  }
  if (typeof data === 'string') {
    const structured = {
      severity: level,
      message: data
    }
    console.log(JSON.stringify(structured))
    return
  }

  const structured = {
    severity: level,
    ...data
  }
  console.log(JSON.stringify(structured))
}

export function info(data: any) {
  logInternal('INFO', data)
}

export function debug(data: any) {
  logInternal('DEBUG', data)
}

export function error(data: any) {
  logInternal('ERROR', data)
}
