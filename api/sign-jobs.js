'use strict';
const crypto = require('node:crypto');
const { createWorkflow } = require('../lib/sign-workflow.js');
module.exports = async (req, res) => {
 res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
 const expected = process.env.CRON_SECRET, provided = String(req.headers?.authorization || '');
 const left = Buffer.from(provided), right = Buffer.from('Bearer ' + expected);
 if (req.method !== 'GET' || !expected || left.length !== right.length || !crypto.timingSafeEqual(left, right)) { res.statusCode = 401; return res.end(JSON.stringify({ ok: false })); }
 try {
  const config = require('./state.js').helpers.supabaseConfig(); if (!config.configured) throw Error();
  const result = await createWorkflow({ ...config, organization: process.env.CRM_STATE_ID || 'marketizo-main' }).drain(5);
  res.statusCode = 200; res.end(JSON.stringify({ ok: true, ...result }));
 } catch { res.statusCode = 503; res.end(JSON.stringify({ ok: false, error: 'Sign obrada je privremeno nedostupna.' })); }
};
