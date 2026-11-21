// Test harness compatibility only: VM tests expect LF after import statements.
import fs from 'node:fs';import {syncBuiltinESMExports} from 'node:module';const read=fs.readFileSync;fs.readFileSync=function(...args){const value=read.apply(this,args);return typeof value==='string'?value.replaceAll('\r\n','\n'):value;};syncBuiltinESMExports();
