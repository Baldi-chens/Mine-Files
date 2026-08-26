export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const path = url.pathname;

    const cors = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
    };
    if(request.method === "OPTIONS") return new Response(null,{headers:cors});

    // 1. 前端传文件给后端，后端转发到免费存储
    if(path === "/api/upload" && request.method === "POST"){
        const formData = await request.formData();
        const title = formData.get("title");
        const desc = formData.get("desc");
        const file = formData.get("file");

        // 后端调用免费文件上传接口，规避跨域
        const uploadForm = new FormData();
        uploadForm.append("file", file);
        const uploadRes = await fetch("https://transfer.sh/", {
            method: "POST",
            body: uploadForm
        });
        const downloadUrl = await uploadRes.text();

        // 存入D1数据库
        const id = crypto.randomUUID();
        await env.DB.prepare(`INSERT INTO files(id,title,desc,download_url) VALUES(?,?,?,?)`)
            .bind(id, title, desc, downloadUrl.trim()).run();
        return new Response(JSON.stringify({ok:true}),{headers:cors});
    }

    // 2. 查询文件列表
    if(path === "/api/list"){
        const keyword = url.searchParams.get("keyword") || "";
        const { results } = await env.DB.prepare(`SELECT * FROM files WHERE title LIKE ?`)
            .bind(`%${keyword}%`).all();
        return new Response(JSON.stringify(results),{headers:cors});
    }

    return new Response("404 Not Found",{status:404,headers:cors});
}
