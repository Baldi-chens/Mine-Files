export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const path = url.pathname;

    // 跨域允许
    const cors = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
    };
    if(request.method === "OPTIONS") return new Response(null,{headers:cors});

    // 上传接口
    if(path === "/api/upload" && request.method === "POST"){
        const form = await request.formData();
        const title = form.get("title");
        const desc = form.get("desc");
        const file = form.get("file");
        const id = crypto.randomUUID();
        // 存入R2存储桶
        await env.FILE_BUCKET.put(id, file.stream(),{httpMetadata:{contentType:file.type}});
        // 写入D1数据库
        await env.DB.prepare(`INSERT INTO files(id,title,desc,filename) VALUES(?,?,?,?)`)
            .bind(id, title, desc, file.name).run();
        return new Response(JSON.stringify({ok:true}),{headers:cors});
    }

    // 列表查询
    if(path === "/api/list"){
        const keyword = url.searchParams.get("keyword") || "";
        const { results } = await env.DB.prepare(`SELECT * FROM files WHERE title LIKE ?`)
            .bind(`%${keyword}%`).all();
        return new Response(JSON.stringify(results),{headers:cors});
    }

    // 下载接口
    if(path.startsWith("/api/download/")){
        const id = path.split("/")[2];
        const file = await env.FILE_BUCKET.get(id);
        const meta = await env.DB.prepare(`SELECT filename FROM files WHERE id = ?`).bind(id).first();
        return new Response(file.body,{
            headers:{...cors,"Content-Disposition":`attachment; filename="${meta.filename}"`}
        })
    }

    return new Response("404 Not Found",{status:404,headers:cors});
}