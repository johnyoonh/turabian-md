function Note(el)
  local html = pandoc.write(pandoc.Pandoc(el.content), "html")
  html = html:gsub("^%s*<p>", ""):gsub("</p>%s*$", "")
  return pandoc.RawInline("html", '<span class="footnote">' .. html .. "</span>")
end
