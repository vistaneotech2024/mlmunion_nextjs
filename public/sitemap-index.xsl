<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <title>XML Sitemap Index - MLM Union</title>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <style type="text/css">
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: "Segoe UI", "Segoe UI Web (West European)", -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
            color: #242424;
            background: #f3f3f3;
            padding: 20px;
            font-size: 14px;
          }
          .pane {
            background: #fff;
            border: 1px solid #e5e5e5;
            border-radius: 4px;
            max-width: 900px;
            margin: 0 auto;
            box-shadow: 0 1px 3px rgba(0,0,0,0.06);
          }
          .title-bar {
            background: #f8f8f8;
            border-bottom: 1px solid #e5e5e5;
            padding: 8px 12px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .title-bar span { color: #666; font-size: 12px; }
          .tree {
            padding: 8px 0;
            user-select: none;
          }
          .tree-root {
            display: flex;
            align-items: center;
            padding: 4px 12px;
            gap: 8px;
            font-weight: 600;
            color: #242424;
          }
          .tree-root .folder-icon { color: #0078d4; }
          .tree-children {
            border-left: 1px solid #e0e0e0;
            margin-left: 18px;
            padding-left: 4px;
          }
          .tree-item {
            display: flex;
            align-items: center;
            padding: 4px 8px;
            gap: 8px;
            min-height: 28px;
            position: relative;
          }
          .tree-item:hover {
            background: #f0f7fc;
          }
          .tree-item a {
            color: #0078d4;
            text-decoration: none;
            display: flex;
            align-items: center;
            gap: 8px;
            flex: 1;
            min-width: 0;
          }
          .tree-item a:hover {
            text-decoration: underline;
          }
          .tree-item .name {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .tree-item .url {
            color: #666;
            font-size: 12px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 320px;
          }
          .folder-icon, .file-icon {
            flex-shrink: 0;
            width: 20px;
            height: 20px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
          }
          .folder-icon { color: #f2b838; }
          .file-icon { color: #0078d4; }
          .tree-line {
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 18px;
            pointer-events: none;
          }
          .info-bar {
            background: #f8f8f8;
            border-top: 1px solid #e5e5e5;
            padding: 6px 12px;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="pane">
          <div class="title-bar">
            <span>Name</span>
          </div>
          <div class="tree">
            <div class="tree-root">
              <span class="folder-icon">📁</span>
              <span>sitemap.xml</span>
            </div>
            <div class="tree-children">
              <xsl:for-each select="sitemap:sitemapindex/sitemap:sitemap">
                <xsl:variable name="loc" select="sitemap:loc"/>
                <xsl:variable name="lastmod" select="sitemap:lastmod"/>
                <xsl:variable name="fileName">
                  <xsl:choose>
                    <xsl:when test="contains($loc, 'sitemap-static')">Static (Home, FAQ, Contact...)</xsl:when>
                    <xsl:when test="contains($loc, 'sitemap-companies')">Companies</xsl:when>
                    <xsl:when test="contains($loc, 'sitemap-blogs')">Blogs</xsl:when>
                    <xsl:when test="contains($loc, 'sitemap-news')">News</xsl:when>
                    <xsl:when test="contains($loc, 'sitemap-classifieds')">Classifieds</xsl:when>
                    <xsl:otherwise>sitemap</xsl:otherwise>
                  </xsl:choose>
                </xsl:variable>
                <div class="tree-item">
                  <span class="folder-icon">📁</span>
                  <a href="{$loc}" target="_blank" title="{$loc}">
                    <span class="name"><xsl:value-of select="$fileName"/></span>
                    <span class="url"><xsl:value-of select="$loc"/></span>
                  </a>
                </div>
              </xsl:for-each>
            </div>
          </div>
          <div class="info-bar">
            <xsl:value-of select="count(sitemap:sitemapindex/sitemap:sitemap)"/> sitemap(s)
          </div>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
