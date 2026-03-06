export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { token, dbId, title, body, tags } = req.body;

  if (!token) return res.status(400).json({ error: "Notion Tokenが未設定です。設定画面から入力してください。" });
  if (!dbId)  return res.status(400).json({ error: "dbIdが必要です" });

  const children = (body || "")
    .trim()
    .split("\n")
    .filter(l => l.trim())
    .map(line => ({
      object: "block",
      type: "paragraph",
      paragraph: { rich_text: [{ type: "text", text: { content: line } }] },
    }));

  try {
    const notionRes = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        parent: { database_id: dbId },
        properties: {
          title: { title: [{ text: { content: title || "クイックメモ" } }] },
          topic_tag: { multi_select: (tags || []).map(t => ({ name: t })) },
        },
        ...(children.length ? { children } : {}),
      }),
    });

    const data = await notionRes.json();
    if (!notionRes.ok) {
      return res.status(notionRes.status).json({ error: data.message || "Notion APIエラー" });
    }
    return res.status(200).json({ url: data.url, id: data.id });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
