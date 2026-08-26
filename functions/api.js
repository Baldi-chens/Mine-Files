export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const path = url.pathname;

    const cors = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });

    // 1. 上传文件：接收base64存入D1
    if (path === "/api/upload" && request.method === "POST") {
        const { title, desc, filename, base64 } = await request.json();
        if (!title || !filename || !base64) {
            return new Response(JSON.stringify({ ok: false, msg: "参数不全" }), { status: 400, headers: cors });
        }
        const id = crypto.randomUUID();
        await env.DB.prepare(
            `INSERT INTO files(id, title, desc, filename, base64) VALUES(?, ?, ?, ?, ?)`
        ).bind(id, title, desc, filename, base64).run();
        return new Response(JSON.stringify({ ok: true }), { headers: cors });
    }

    // 2. 文件列表查询
    if (path === "/api/list") {
        const keyword = url.searchParams.get("keyword") || "";
        const { results } = await env.DB.prepare(
            `SELECT id, title, desc, filename FROM files WHERE title LIKE ?`
        ).bind(`%${keyword}%`).all();
        return new Response(JSON.stringify(results), { headers: cors });
    }

    // 3. 下载文件：解码base64返回文件
    if (path.startsWith("/api/download/")) {
        const id = path.split("/")[2];
        const file = await env.DB.prepare(`SELECT filename, base64 FROM files WHERE id = ?`).bind(id).first();
        if (!file) return new Response("文件不存在", { status: 404, headers: cors });
        
        const binary = atob(file.base64);
        const buffer = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            buffer[i] = binary.charCodeAt(i);
        }
        return new Response(buffer, {
            headers: {
                ...cors,
                "Content-Disposition": `attachment; filename="${file.filename}"`
            }
        });
    }

    return new Response("404 Not Found", { status: 404, headers: cors });
}
