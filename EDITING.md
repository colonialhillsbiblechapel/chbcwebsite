# How to update the website

Anyone can do this — no technical knowledge is needed. You fill in simple forms, press **Save**,
and about two minutes later the change is on the website. Nothing you do can break the site: if
something isn't filled in properly, the website simply keeps showing what it showed before.

## Signing in

1. On the website, open **Resources**. At the very bottom, click **Website editors**.
2. Sign in with the email address you were invited with, and follow the steps in the email that
   Pages CMS sends you.
3. Choose **chbcwebsite**. The parts of the website you can change are listed on the left.

Each form asks plain questions, with an example under each one. Times and many other answers are
chosen from a list, so there is little to type.

## The most common jobs

### Add an event

1. Click **Events** on the left, then add a new entry.
2. Answer the questions: what the event is, which day (click the calendar), and the time (choose
   it from the list).
3. Leave **Where?** empty if it is at the chapel.
4. Press **Save**.

When the event's day has passed, it disappears from the website by itself. You never need to delete
old events.

### Add a sermon or video

1. On YouTube, open the video, click **Share**, then **Copy**.
2. In the editor, click **Sermons & videos** on the left, then add a new entry.
3. Paste the link into **YouTube link**.
4. Choose what kind of message it is, then type the title and the speaker, and choose the date.
5. For a conference message, also type the conference number (for example 106).
6. Press **Save**. The video's picture is taken from YouTube by itself.

### Change a meeting time

1. Click **Meeting times** on the left, then the day.
2. Open the meeting, choose the new time from the list, and press **Save**.

### Update a missionary or a helpful link

Click **Missionaries** or **Helpful links**, open the entry, change what you need, and press
**Save**. Show a missionary's name or photo only with their agreement (and their mission's).

## Good to know

- **Every change is kept.** Earlier versions can always be brought back, so don't worry about
  making a mistake.
- **Not here on purpose:** the Doctrines & Practices, the beliefs, the Gospel and history pages,
  and the hymns are kept exactly as the elders approved them. Ask the web team about any change.
- **If a change hasn't appeared after five minutes,** something wasn't filled in properly. Tell the
  web team; they can see exactly what happened.
- Use only the chapel's own photos, or photos you have permission to use.
- No political content of any kind (the chapel is a 501(c)(3) church).
- Editors must be 18 or older (Pages CMS's terms).

## For the web team: setting up the editor (once)

1. At <https://app.pagescms.org>, sign in with GitHub as the **chapel account**. When it offers to
   install the Pages CMS GitHub App, choose **Only select repositories** and pick `chbcwebsite`
   alone.
2. Open **chbcwebsite**; the sections above appear on the left, with **Start here** at the top.
3. Invite each editor by their email address (Pages CMS "collaborators"). Editors can change
   content and pictures only; they can't change the editor's setup or invite others.

The forms are defined in `.pages.yml` and follow the site's content rules in
`website/src/content.config.ts`.
