import { getSchemaSourceEnvironment, printSourceGuard } from './schema-source-env.mjs'

const environment = getSchemaSourceEnvironment()
const ok = printSourceGuard(environment)
process.exit(ok ? 0 : 1)
