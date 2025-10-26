import axios from "axios";
import * as cheerio from "cheerio";

export interface SEOData {
  title: string;
  description: string;
  keywords: string;
  image_url?: string;
  site_name: string;
  og_url: string;
  og_type: string;
}

class SeoService {
  getSeoData = async (url: string) => {
    try {
      const dataRaw = await axios.get(url, {
        // fake browser request to avoid blocking by some websites
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
          Accept: "text/html",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });
      const html = dataRaw.data as string;
      const $ = cheerio.load(html);

      const title =
        $('meta[property="og:title"]').attr("content") || $("title").text();
      const description =
        $('meta[property="og:description"]').attr("content") ||
        $('meta[name="description"]').attr("content");
      const image_url = $('meta[property="og:image"]').attr("content");
      const keywords = $('meta[name="keywords"]').attr("content") || "";
      const site_name =
        $('meta[property="og:site_name"]').attr("content") || "";
      const og_url = $('meta[property="og:url"]').attr("content") || "";
      const og_type = $('meta[property="og:type"]').attr("content") || "";
      return {
        title: title || "",
        description: description || "",
        image_url: image_url || "",
        site_name: site_name || "",
        og_url: og_url || "",
        og_type: og_type || "",
        keywords: keywords || "",
      } as SEOData;
    } catch {
      return {
        title: "",
        description: "",
        image_url: "",
        site_name: "",
        og_url: "",
        og_type: "",
        keywords: "",
      } as SEOData;
    }
  };
  createMetaHTML = (data: SEOData) => {
    return `
    <!DOCTYPE html>
    <html lang="en">
<head>
    <meta property="og:title" content="${data.title}" />
    <meta property="og:description" content="${data.description}" />
    <meta property="og:image" content="${data.image_url || ""}" />
    <meta property="og:site_name" content="${data.site_name}" />
    <meta property="og:url" content="${data.og_url}" />
    <meta property="og:type" content="${data.og_type}" />
    <meta name="description" content="${data.description}" />
    <meta name="keywords" content="${data.keywords}" />
    <title>${data.title}</title>
</head>
<body>
Redirecting...
</body>
</html>
    `;
  };
  createProtectedMetaHTML = () => {
    return `
    <!DOCTYPE html>
    <html lang="en">
<head>
    <meta property="og:title" content="Protected Link | ShortLink" />
    <meta property="og:description" content="Đây là liên kết được bảo vệ bằng mật khẩu." />
    <meta property="og:image" content="" />
    <meta property="og:site_name" content="Shorten URL Service" />
    <meta property="og:url" content="" />
    <meta property="og:type" content="website" />
    <meta name="description" content="Đây là liên kết được bảo vệ bằng mật khẩu." />
    <meta name="keywords" content="protected, password, link" />
    <title>Protected Link | ShortLink</title>
</head>
<body>
Đây là liên kết được bảo vệ bằng mật khẩu.
</body>
</html>
    `;
  };
  createNotFoundMetaHTML = () => {
    return `
    <!DOCTYPE html>
    <html lang="en">
<head>
    <meta property="og:title" content="Link Not Found | ShortLink" />
    <meta property="og:description" content="Liên kết không tồn tại hoặc đã bị vô hiệu hóa." />
    <meta property="og:image" content="" />
    <meta property="og:site_name" content="Shorten URL Service" />
    <meta property="og:url" content="" />
    <meta property="og:type" content="website" />
    <meta name="description" content="Liên kết không tồn tại hoặc đã bị vô hiệu hóa." />
    <meta name="keywords" content="not found, disabled, link" />
    <title>Link Not Found | ShortLink</title>
</head>
<body>

</body>
</html>
    `;
  };
}

export const seoService = new SeoService();
