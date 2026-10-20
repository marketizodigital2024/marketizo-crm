'use strict';
const crypto = require('node:crypto');
const { createWorkflow } = require('../lib/sign-workflow.js');
function createHandler(deps = {}) { return async (req, res) => {
 res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
 const expected = process.env.CRON_SECRET, provided = String(req.headers?.authorization || '');
 const left = Buffer.from(provided), right = Buffer.from('Bearer ' + expected);
 if (req.method !== 'GET' || !expected || left.length !== right.length || !crypto.timingSafeEqual(left, right)) { res.statusCode = 401; return res.end(JSON.stringify({ ok: false })); }
 try {
  const config = (deps.config || require('./state.js').helpers.supabaseConfig)(); if (!config.configured) throw Error();
  const flow = (deps.createWorkflow || createWorkflow)({ ...config, organization: process.env.CRM_STATE_ID || 'marketizo-main' });
  const maintenance = await flow.maintenance();
  if (maintenance.ok !== true) throw Error();
  const result = await flow.drain(5);
  res.statusCode = 200; res.end(JSON.stringify({ ok: true, ...result, maintenance }));
 } catch { res.statusCode = 503; res.end(JSON.stringify({ ok: false, error: 'Sign obrada je privremeno nedostupna.' })); }
}; }
module.exports = createHandler();
module.exports.createHandler = createHandler;
