inline:
  #!/usr/bin/env bash
  awk '
  /<link rel="stylesheet" href="style.css"/ {
    print "<style>";
    system("cat style.css");
    print "</style>";
    next;
  }
  /<script src="script.js"><\/script>/ {
    print "<script>";
    system("cat script.js");
    print "</script>";
    next;
  }
  { print }
  ' dev.html > index.html
  echo "Created index.html with embedded CSS and JS"

