# Marketizo CRM Cloud workflow

## What this change provides
A reproducible install/check entry point and GitHub pull-request checks, with no deployment step.
Vercel Git deployments are disabled by `git.deploymentEnabled: false` in `vercel.json`.
Existing live services and server schedules continue running; disabling Git deployments does not stop them.
This repository change alone does not create a Codex Cloud environment, pair a phone, grant a connector access, or enforce GitHub branch protection.

## Activate Codex Cloud
1. In ChatGPT web or desktop choose **Work in > Cloud > Select environment > Create environment**.
2. Connect GitHub and select only `marketizodigital2024/marketizo-crm`. Review any requested access yourself.
3. Use Node.js 24 (22 is also tested), pnpm 10, Python 3.12+, and a Linux environment.
4. Configure the install script to run `bash .codex/setup.sh` from the repository root.
5. Allow package registries for dependency installation. Leave production credentials out of this development environment.
6. Run `bash .codex/check.sh` as the first validation task. Review setup/test results and publish the environment privately.
7. These files must be present on the selected ref. Before this PR is merged, select its branch if supported; otherwise wait for the reviewed merge.
8. On mobile, open Codex, select this published environment, and start a coding task. Cloud tasks can continue while the laptop sleeps.

The setup script must be configured explicitly: placing it under `.codex/` does not automatically activate it.
GitHub connector access in a chat and Codex Cloud repository access are separate grants.

## Checks and delivery
- `bash .codex/setup.sh`: frozen pnpm install and isolated Python environment.
- `bash .codex/check.sh`: CRM regression suite, static build with asset/private-source checks, and PDF fixture tests.
- GitHub **CRM regression checks** additionally covers Node 22/24, Chrome, and mobile WebKit.
- Workflow events: pull request, push to main, and manual dispatch after the workflow exists on the default branch. No schedule and no deploy job.
- Check commands use repository fixtures; browser checks run headlessly in GitHub, without controlling the user's local browser.
- Review all results on the PR. Do not merge with failed or missing jobs.
- A repository admin should require `regression (22)`, `regression (24)`, `sign-pdf`, `sign-browser`, and `sign-webkit` through GitHub Settings > Rules > Rulesets for main. The workflow itself cannot make its results mandatory.

## Release boundary
Finish coding tasks at a draft PR. No auto-merge or automatic release.
After explicit release approval, verify the exact commit, Vercel team/project, checks, and required database compatibility before a manual release.
Do not reconnect or change a Railway service's tracked branch as part of Cloud setup.
The Vercel setting controls its Git integration; it does not govern other providers, deploy hooks, CLI releases, or unrelated projects. Inspect those separately before changing them.

## Phone access to existing local work
In the desktop app open **Settings > Connections > Control this Mac/PC > Set up/Add**.
Complete verification and scan the QR code with the phone using the same account/workspace.
Review the permitted host and keep-awake setting yourself. The host must be awake, online, and running the app.
Use this route for existing local files/chats. It does not upload the laptop's files or migrate local chat history into Cloud.
Commit code to GitHub and keep durable context in the repository or an approved connected service.

## Integrations
- **GitHub:** branches, code review, test results, and PR delivery.
- **Vercel:** manual releases after approval; connector access must include the intended team.
- **ClickUp:** project queue and task context when its connector is available. Confirm the destination list before creating tasks; include a PR link only when posting is authorized.
- **HighLevel:** treat existing business automation as a separate service. A running Railway monitor is not a general HighLevel tool connection. Connect a suitably scoped integration before promising direct contact, opportunity, calendar, or message operations.
- Never copy HighLevel or other production secrets into test jobs, this public repository, or chat.

## Background work
An active Cloud coding task can work autonomously within its authorized scope.
Returning later or periodically checking status requires a scheduled task or supported event trigger.
Desktop schedules that use local files require the host and app to remain running.
Do not silently add periodic jobs, change existing business schedules, send customer messages, or expand access.

## Official references
- [Codex Cloud](https://learn.chatgpt.com/docs/cloud)
- [Cloud environments](https://learn.chatgpt.com/docs/environments/cloud-environments)
- [Mobile/remote connections](https://learn.chatgpt.com/docs/remote-connections)
- [Scheduled tasks](https://learn.chatgpt.com/docs/automations)
- [Vercel Git deployment controls](https://vercel.com/docs/project-configuration/git-configuration)
