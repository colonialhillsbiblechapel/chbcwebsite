# Updating the website — a guide for volunteer editors

The Colonial Hills Bible Chapel website is updated through a simple online editor, **Pages CMS**.
You fill in forms; when you save, the website rebuilds itself and your change is live in **about
two minutes**. You need no technical knowledge and no GitHub account.

## Signing in

1. On the website, open **Resources** and, at the very bottom, click **Website editors**
   (or go straight to <https://app.pagescms.org>).
2. Sign in with the email address you were invited with, and follow the steps in the email
   Pages CMS sends you.
3. Choose **chbcwebsite**. The sections you can edit are listed on the left.

## What you can update

| Section                                 | What it is                                                                           |
| --------------------------------------- | ------------------------------------------------------------------------------------ |
| **Meetings & Events → Upcoming events** | Special events on the homepage. Each disappears by itself after its day.             |
| **Meetings & Events → Weekly meetings** | The regular meeting times (homepage, About page, footer).                            |
| **Messages → Recorded messages**        | The media library.                                                                   |
| **Messages → Series**                   | Series of messages, e.g. _Light from the Word_.                                      |
| **Messages → Videos left off the site** | YouTube videos that should not appear on the website.                                |
| **Missionaries**                        | The Ministries page.                                                                 |
| **Helpful links**                       | The Resources page.                                                                  |
| **Church details**                      | Name, address, phone, email, the footer verse, and how the chapel appears in Google. |

The **Doctrines & Practices**, the beliefs, the Gospel and history pages, and the hymns are not in
the editor: they are kept exactly as the elders approved them. Ask the web team for any change there.

## Everyday tasks

**Add an event.** Upcoming events → add a new entry. Fill in the title, the date and the time
(pick it from the list), and a sentence about it. Leave _Where_ empty when it is at the chapel.
Save. There is no need to delete old events; they drop off the site after their day.

**Add a recorded message.** On YouTube, open the video, click **Share**, then **Copy**. In the
editor, Recorded messages → add a new entry, paste the link into **YouTube link**, then fill in
the title, speaker, date and kind of message (for a conference message, also its number, e.g.
106). Save. The video's picture is taken from YouTube by itself.

**Change a meeting time.** Weekly meetings → the day → change the time in the list → Save.

**Hide a video.** Videos left off the site → add its YouTube ID (the 11 letters after
`watch?v=` or `youtu.be/`) and a short note.

## Good to know

- **Checks before going live.** If something doesn't fit (a missing title, a date in the wrong
  form, a link without `https://`), the site keeps showing the previous version and your change
  waits. If a change hasn't appeared after five minutes, tell the web team.
- **Every change is kept.** Earlier versions can always be brought back; nothing you do is lost.
- **People's names and photos.** Show a missionary's name or photo only with their agreement (and
  their mission's). If someone asks to be removed, remove them straight away.
- **Pictures.** Use only the chapel's own photos, or photos you have permission to use.
- **No political content** of any kind (the chapel is a 501(c)(3) church).
- Editors must be **18 or older** (Pages CMS's terms).

## For the web team: setting up the editor (once)

1. At <https://app.pagescms.org>, sign in with GitHub as the **chapel account**. When it offers
   to install the Pages CMS GitHub App, choose **Only select repositories** and pick
   `chbcwebsite` alone.
2. Open **chbcwebsite**; the sections above appear on the left.
3. Invite each editor by their email address (Pages CMS "collaborators"). Editors can change
   content and pictures only; they can't change the editor's setup or invite others.

The forms are defined in [`.pages.yml`](.pages.yml) and mirror the site's content rules in
`website/src/content.config.ts`.
