function setEditMode(editMode) {
  let editor = document.getElementById("editor");
  let toolbar = document.getElementById("toolbar");
  let filename = document.getElementById("filename");

  if (editMode) {
    editor.contentEditable = "true";
    filename.contentEditable = "plaintext-only";
    toolbar.style.display = "flex";
  } else {
    editor.contentEditable = "false";
    filename.contentEditable = "false";
    toolbar.style.display = "none";
  }
}

async function exportToFile(save, editMode) {
  let filename = document.getElementById("filename").innerText.trim();
  if (!filename) {
    alert("title is empty!");
    return;
  }

  filename = filename.endsWith(".html") ? filename : filename + ".html";

  if (editMode === false) {
    setEditMode(false);
  }

  let content = document.documentElement.outerHTML;
  let blob = new Blob(["<!DOCTYPE html>\n" + content], { type: "text/html" });
  let file = new File([blob], filename, { type: "text/html" });

  if (editMode === false) {
    setEditMode(true);
  }

  if (
    save == false &&
    navigator.canShare &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({
        files: [file],
        title: filename,
        text: "",
      });
    } catch (error) {
      console.error("share failed:", error);
    }
  } else {
    let a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}

function insertImage(event) {
  let file = event.target.files[0];
  if (file) {
    let reader = new FileReader();
    reader.onload = function (e) {
      let img = document.createElement("img");
      img.src = e.target.result;
      document.querySelector("#editor").appendChild(img);
    };
    reader.readAsDataURL(file);
  }
}

// Toggle dropdown visibility
function toggleDropdown(id) {
  const dropdown = document.getElementById(id);
  if (dropdown.classList.contains("show")) {
    dropdown.classList.remove("show");
  } else {
    // Close any open dropdowns first
    document
      .querySelectorAll(".dropdown-content")
      .forEach((el) => el.classList.remove("show"));
    dropdown.classList.add("show");
  }
}

// Close dropdowns if clicking outside
document.addEventListener("click", function (e) {
  if (!e.target.closest(".dropdown")) {
    document
      .querySelectorAll(".dropdown-content")
      .forEach((el) => el.classList.remove("show"));
  }
});

// Helper: Place the caret at a given element and offset.
function setCaret(el, pos) {
  const selection = window.getSelection();
  const range = document.createRange();
  range.setStart(el, pos);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

// Wrap only the selected portions of text nodes.
// If selection is entirely within one text node, process it directly.
function wrapRangeText(range, tagName, style, hook) {
  const textNodes = [];
  if (range.commonAncestorContainer.nodeType === Node.TEXT_NODE) {
    textNodes.push(range.commonAncestorContainer);
  } else {
    const walker = document.createTreeWalker(
      range.commonAncestorContainer,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function (node) {
          return range.intersectsNode(node)
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT;
        },
      },
    );
    let node;
    while ((node = walker.nextNode())) {
      textNodes.push(node);
    }
  }

  textNodes.forEach(function (textNode) {
    let start = 0,
      end = textNode.textContent.length;
    if (textNode === range.startContainer) {
      start = range.startOffset;
    }
    if (textNode === range.endContainer) {
      end = range.endOffset;
    }
    if (start >= end) return;

    const parent = textNode.parentNode;
    const wrapper = document.createElement(tagName);
    if (style) {
      wrapper.style.cssText = style;
    }
    if (hook) {
      hook(wrapper);
    }
    wrapper.textContent = textNode.textContent.substring(start, end);

    const frag = document.createDocumentFragment();
    const beforeText = textNode.textContent.substring(0, start);
    const afterText = textNode.textContent.substring(end);
    if (beforeText) {
      frag.appendChild(document.createTextNode(beforeText));
    }
    frag.appendChild(wrapper);
    if (afterText) {
      frag.appendChild(document.createTextNode(afterText));
    }
    parent.replaceChild(frag, textNode);
  });
}

// Basic inline formatting: wraps the selection in the specified tag.
function applyFormat(tagName) {
  const selection = window.getSelection();
  if (!selection.rangeCount || selection.isCollapsed) return;
  const range = selection.getRangeAt(0);
  const editor = document.getElementById("editor");
  if (!editor.contains(range.commonAncestorContainer)) return;
  wrapRangeText(range, tagName);
  selection.removeAllRanges();
}

// Apply inline style (e.g., font-size, text color, background color) by wrapping the selection in a <span>.
function applyStyle(styleString) {
  const selection = window.getSelection();
  if (!selection.rangeCount || selection.isCollapsed) return;
  const range = selection.getRangeAt(0);
  const editor = document.getElementById("editor");
  if (!editor.contains(range.commonAncestorContainer)) return;
  wrapRangeText(range, "span", styleString);
  selection.removeAllRanges();
}

// Apply inline url
function applyURL() {
  const selection = window.getSelection();
  if (!selection.rangeCount || selection.isCollapsed) return;
  const range = selection.getRangeAt(0);
  const editor = document.getElementById("editor");
  if (!editor.contains(range.commonAncestorContainer)) return;
  const url = prompt("URL");
  if (!url) return;
  wrapRangeText(range, "a", null, function (element) {
    element.href = url;
  });
  selection.removeAllRanges();
}

// Called by the text size dropdown.
function applyTextSize(size) {
  if (!size) return;
  applyStyle("font-size: " + size + ";");
}

// Called when a text color swatch is clicked.
function applyTextColor(color) {
  if (!color) return;
  applyStyle("color: var(--note-text-color-" + color + ");");
}

// Called when a highlight (background color) swatch is clicked.
function applyHighlightColor(color) {
  if (!color) return;
  applyStyle("background-color: var(--note-highlight-color-" + color + ");");
}

// Convert the current block (direct child of #editor) to the chosen tag.
function changeBlock(tag) {
  const selection = window.getSelection();
  if (!selection.rangeCount) return;
  let node = selection.anchorNode;
  const editor = document.getElementById("editor");
  while (node && node.parentNode !== editor) {
    node = node.parentNode;
  }
  if (!node || node === editor) return;
  const newBlock = document.createElement(tag);
  while (node.firstChild) {
    if (
      node.firstChild.nodeType === Node.ELEMENT_NODE &&
      node.firstChild.matches("p") &&
      tag.match(/^H[1-6]$/)
    ) {
      let child = node.firstChild;
      while (child.firstChild) {
        newBlock.appendChild(child.firstChild);
      }
      node.removeChild(child);
    } else {
      newBlock.appendChild(node.firstChild);
    }
  }
  editor.replaceChild(newBlock, node);
  const range = document.createRange();
  range.selectNodeContents(newBlock);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

// Splits the current block at the caret.
function splitBlock() {
  const editor = document.getElementById("editor");
  const selection = window.getSelection();
  if (!selection.rangeCount) return;
  const range = selection.getRangeAt(0);

  let block = range.startContainer;
  while (block && block.parentNode !== editor) {
    block = block.parentNode;
  }
  if (!block) {
    const p = document.createElement("p");
    p.innerHTML = "<br>";
    editor.appendChild(p);
    setCaret(p, 0);
    return;
  }

  const afterRange = range.cloneRange();
  afterRange.setStart(range.endContainer, range.endOffset);
  afterRange.setEndAfter(block.lastChild || block);
  const afterContent = afterRange.cloneContents();

  const isAtEnd = !Array.from(afterContent.childNodes).some((n) => {
    return (
      n.nodeType === Node.ELEMENT_NODE ||
      (n.nodeType === Node.TEXT_NODE && n.textContent.trim())
    );
  });

  if (isAtEnd) {
    const newBlock = document.createElement("p");
    newBlock.innerHTML = "<br>";
    if (block.nextSibling) {
      editor.insertBefore(newBlock, block.nextSibling);
    } else {
      editor.appendChild(newBlock);
    }
    setCaret(newBlock, 0);
  } else {
    const newBlock = document.createElement("p");
    const extractRange = range.cloneRange();
    extractRange.setEndAfter(block.lastChild || block);
    const extracted = extractRange.extractContents();
    if (!extracted.childNodes.length) {
      newBlock.innerHTML = "<br>";
    } else {
      newBlock.appendChild(extracted);
    }
    if (block.nextSibling) {
      editor.insertBefore(newBlock, block.nextSibling);
    } else {
      editor.appendChild(newBlock);
    }
    setCaret(newBlock, 0);
  }

  if (
    !block.textContent.trim() &&
    !block.querySelector("img, video, iframe, embed, object")
  ) {
    block.innerHTML = "<br>";
  }
}

// Normalize stray text nodes and nested blocks.
function normalizeEditor() {
  const editor = document.getElementById("editor");
  Array.from(editor.childNodes).forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
      const p = document.createElement("p");
      p.textContent = node.textContent;
      editor.replaceChild(p, node);
    }
  });
  editor
    .querySelectorAll(
      "p p, h1 p, h2 p, h3 p, h4 p, h5 p, h6 p, p font, small p",
    )
    .forEach((nested) => {
      const parent = nested.parentNode;
      while (nested.firstChild) {
        parent.insertBefore(nested.firstChild, nested);
      }
      parent.removeChild(nested);
    });
}

// Normalize stray text nodes and nested blocks.
function cleanEditor() {
  const editor = document.getElementById("editor");
  if (
    editor.firstChild &&
    ["H1", "H2", "H3", "H4", "H5", "H6", "P"].includes(
      editor.firstChild.nodeName,
    )
  ) {
    return;
  }
  if (editor.innerHTML.trim() === "" || editor.innerHTML.trim() === "<br>") {
    editor.innerHTML = "<p></p>";
  }
}

function updateTitle() {
  let filename = document.getElementById("filename");
  if (filename.innerHTML === "<br>") {
    filename.innerHTML = "";
  }
  document.title = filename.innerHTML.trim() || "Nash : Note as HTML";
}

function keydownHandler(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    splitBlock();
  }
  if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "y")) {
    e.preventDefault();
  }
}

function clickHandler(e) {
  const target = e.target.closest("a");
  if (!target || !document.getElementById("editorContainer").contains(target))
    return;

  e.preventDefault();

  const userConfirmed = confirm(`"${target.href}" open this url?`);
  if (userConfirmed) {
    window.open(target.href, "_blank");
  }
}

function unloadHandler(e) {
  if (document.getElementById("editor").contentEditable !== "true") {
    return;
  }
  e.preventDefault();
  e.returnValue = "";
}

editor = document.getElementById("editor");
filename = document.getElementById("filename");

editor.addEventListener("keydown", keydownHandler);
editor.addEventListener("click", clickHandler);
editor.addEventListener("blur", normalizeEditor);
editor.addEventListener("input", cleanEditor);
editor.addEventListener("focus", cleanEditor);

filename.addEventListener("input", updateTitle);

window.addEventListener("beforeunload", unloadHandler);

updateTitle();
