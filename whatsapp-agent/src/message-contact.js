/** A group message's wire author is usable even when WhatsApp's optional contact lookup fails. */
export function messageAuthorId(message) {
  const value = message.author;
  const id = typeof value === "string" ? value : value?._serialized || value?.$1;
  return /^\d+(?::\d+)?@(c\.us|lid)$/.test(id || "") ? id : "";
}

export async function resolveGroupMessageContact(message, lookup, onFallback = () => {}) {
  try {
    const contact = await lookup();
    if (contact?.id) return contact;
    throw new Error("WhatsApp returned no contact identity");
  } catch (error) {
    const author = messageAuthorId(message);
    // Never synthesize owner/private-message authentication or invent a missing sender.
    if (!String(message.from || "").endsWith("@g.us") || !author) throw error;
    const [user, server] = author.split("@");
    onFallback({ code: "contact_lookup_unavailable" });
    return {
      id: { _serialized: author, user, server },
      // A LID is an opaque ID, never a phone number. No display name is trusted as a team identity.
      ...(server === "c.us" ? { number: user.split(":")[0] } : {}),
      identitySource: "message_author",
      displayNameUnavailable: true
    };
  }
}
