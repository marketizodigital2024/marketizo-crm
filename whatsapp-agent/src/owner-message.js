/** Keep every character and prefer whole paragraphs; never silently truncate an owner report. */
export function splitOwnerMessage(value, limit = 3500) {
  if (!Number.isInteger(limit) || limit < 2) throw Error("Invalid message limit");
  let text = String(value || "");
  const parts = [];
  while (text.length > limit) {
    let end = text.lastIndexOf("\n\n", limit - 2);
    if (end >= limit / 2) end += 2;
    else {
      end = text.lastIndexOf("\n", limit - 1);
      if (end >= limit / 2) end += 1;
      else {
        end = text.lastIndexOf(" ", limit - 1);
        if (end >= limit / 2) end += 1;
        else end = limit;
      }
    }
    // A UTF-16 length limit must not split an emoji/surrogate pair.
    if (/[\uD800-\uDBFF]/.test(text[end - 1])) end -= 1;
    parts.push(text.slice(0, end));
    text = text.slice(end);
  }
  if (text || !parts.length) parts.push(text);
  return parts;
}

export async function sendOwnerMessage(send, to, body, label) {
  const parts = splitOwnerMessage(body);
  let result;
  for (let i = 0; i < parts.length; i += 1) {
    result = await send(to, parts[i], parts.length === 1 ? label : `${label} part ${i + 1}/${parts.length}`);
  }
  return result;
}
