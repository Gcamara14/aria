(function() {
    /**
     * SVG & Icon Audit Bookmarklet
     * Checks SVGs and Icon Fonts for proper accessibility:
     * 1. Check if aria-hidden="true" (Decorative)
     * 2. If not hidden, MUST have role="img" AND an Accessible Name
     */

    // --- Helper: Compute Accessible Name (Simplified from AccName) ---
    function isVisible(el) {
        if (!el || el.nodeType !== 1) return false;
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
    }

    function computeName(el) {
        // 1. aria-labelledby
        if (el.hasAttribute('aria-labelledby')) {
            const ids = el.getAttribute('aria-labelledby').split(/\s+/);
            let parts = [];
            for (const id of ids) {
                const ref = document.getElementById(id);
                if (ref) parts.push(ref.textContent || ref.innerText);
            }
            if (parts.length > 0) return parts.join(' ').trim();
        }
        // 2. aria-label
        if (el.hasAttribute('aria-label')) return el.getAttribute('aria-label').trim();
        
        // 3. Native (SVG title)
        if (el.tagName.toLowerCase() === 'svg') {
            const title = el.querySelector('title');
            if (title && title.textContent) return title.textContent.trim();
        }

        // 4. Content (for icon fonts with text?)
        // Usually icon fonts are empty, but sometimes have text.
        if (el.innerText && el.innerText.trim().length > 0) return el.innerText.trim();

        return '';
    }

    // --- Main Logic ---
    const issues = [];
    
    // Select SVGs and potential Icon Fonts
    // Heuristic for icons: role="img", or classes with 'icon', 'fa-', 'glyph'
    const candidates = document.querySelectorAll('svg, [role="img"], i, span[class*="icon"], span[class*="fa-"], span[class*="glyph"]');

    candidates.forEach(el => {
        if (!isVisible(el)) return;
        
        const tag = el.tagName.toLowerCase();
        const role = el.getAttribute('role');
        const isHidden = el.closest('[aria-hidden="true"]') !== null;
        const name = computeName(el);
        const hasTitleAttr = el.hasAttribute('title');

        // Filter out noise: 
        if (tag !== 'svg' && role !== 'img') {
            // Skip if it has significant text content (likely actual italic text)
            if (el.innerText.trim().length > 2) return;

            // For spans, we still need an icon-like class to avoid flagging layout spans
            if (tag === 'span') {
                const cls = (el.className || '').toString();
                if (!cls.match(/icon|fa-|glyph|symbol|material|ld-/i)) return;
            }
            // For <i>, we accept it as a candidate if it has short/no text (no class check needed)
        }

        // Status Determination
        let status = 'Pass';
        let msg = '';
        let suggestion = '';

        if (isHidden) {
            status = 'Pass (Decorative)';
            // Optional warning: if it's hidden but has a name, that's weird but not an error per se.
        } else {
            // It is visible/meaningful
            const missingRole = role !== 'img';
            const missingName = !name;

            if (missingRole && missingName) {
                status = 'Fail';
                msg = 'Visible icon missing role="img" AND accessible name';
                suggestion = 'Add aria-hidden="true" if decorative. OR add role="img" and aria-label="..." if meaningful.';
            } else if (missingRole) {
                status = 'Fail';
                msg = 'Visible icon missing role="img"';
                suggestion = 'Add role="img" to ensure it is treated as an image.';
            } else if (missingName) {
                status = 'Fail';
                if (hasTitleAttr) {
                    msg = 'Icon uses title="..." but missing aria-label';
                    suggestion = 'The title attribute computes to a Description, not a Name. Use aria-label="..." to provide a valid Accessible Name.';
                } else {
                    msg = 'Visible icon missing accessible name';
                    suggestion = 'Add aria-label="..." describing the icon, or aria-hidden="true" if decorative.';
                }
            } else {
                status = 'Pass (Meaningful)';
            }
        }

        // Only report Fails or Meaningful icons (to verify)
        // We can show all for audit purposes, or just fails. Let's show all but highlight fails.
        
        items = {
            element: el,
            tag: tag,
            type: tag === 'svg' ? 'SVG' : 'Icon Font',
            isHidden: isHidden,
            role: role || '-',
            name: name || '-',
            status: status,
            msg: msg,
            suggestion: suggestion
        };
        
        issues.push(items);
    });

    // --- Output ---
    const win = window.open('', 'SVGAudit', 'width=1100,height=700,scrollbars=yes,resizable=yes');
    if (!win) { alert('Popups blocked'); return; }
    
    const doc = win.document;
    doc.open();
    doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>SVG & Icon Audit</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 20px; background: #f4f5f7; color: #172b4d; }
                header { background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); margin-bottom: 20px; }
                h1 { margin: 0 0 10px 0; font-size: 24px; color: #0052cc; }
                .count { font-size: 16px; color: #5e6c84; }
                table { width: 100%; background: #fff; border-collapse: collapse; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
                th { background: #fafbfc; text-align: left; padding: 12px; border-bottom: 2px solid #dfe1e6; font-size: 12px; text-transform: uppercase; color: #5e6c84; }
                td { padding: 12px; border-bottom: 1px solid #dfe1e6; font-size: 14px; vertical-align: top; }
                tr:hover { background: #ebecf0 !important; cursor: pointer; }
                code { background: #ebecf0; padding: 2px 4px; border-radius: 3px; font-family: monospace; font-size: 12px; }
                .status-pass { color: #006644; font-weight: bold; }
                .status-fail { color: #bf2600; font-weight: bold; }
                .suggestion { color: #0052cc; font-size: 12px; }
            </style>
        </head>
        <body>
            <header>
                <h1>SVG & Icon Audit</h1>
                <div class="count">Found ${issues.length} icons</div>
                <div style="margin-top: 15px; padding: 15px; background: #deebff; border-radius: 6px; border: 1px solid #0052cc; color: #0747a6; font-size: 13px;">
                    <strong>Recommended Fixes:</strong>
                    <ul style="margin: 5px 0 0 20px; padding: 0;">
                        <li><strong>Safest Logic:</strong> Target the SVG directly. If it has no accessible name, apply <code>aria-hidden="true"</code> and <code>focusable="false"</code>.</li>
                        <li><strong>Targeting:</strong> Apply attributes to the SVG element itself to avoid accidentally hiding sibling content.</li>
                        <li><strong>Containers:</strong> <code>aria-hidden="true"</code> on a parent container is also valid (e.g. a wrapper div).</li>
                        <li><strong>Meaningful Icons:</strong> MUST have <code>role="img"</code> AND a valid Accessible Name.</li>
                        <li><strong>Tooltips:</strong> The <code>title</code> attribute is for mouse hover only. It does NOT count as an accessible name here. Use <code>aria-label</code>.</li>
                    </ul>
                </div>
            </header>
            <div id="table-container"></div>
        </body>
        </html>
    `);
    doc.close();

    if (issues.length === 0) {
        const msg = doc.createElement('div');
        msg.style.padding = '20px';
        msg.style.textAlign = 'center';
        msg.style.color = '#006644';
        msg.innerHTML = '<h3>No SVGs or Icons found!</h3>';
        doc.getElementById('table-container').appendChild(msg);
        return;
    }

    const table = doc.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Element</th>
                <th>Type</th>
                <th>Hidden?</th>
                <th>Role</th>
                <th>Acc Name</th>
                <th>Status</th>
                <th>Issue / Fix</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
    const tbody = table.querySelector('tbody');

    // Sort: Fails first
    issues.sort((a, b) => {
        const aFail = a.status.startsWith('Fail');
        const bFail = b.status.startsWith('Fail');
        if (aFail && !bFail) return -1;
        if (!aFail && bFail) return 1;
        return 0;
    });

    issues.forEach(item => {
        const tr = doc.createElement('tr');
        const statusClass = item.status.startsWith('Fail') ? 'status-fail' : 'status-pass';
        
        tr.innerHTML = `
            <td><code>&lt;${item.tag}&gt;</code></td>
            <td>${item.type}</td>
            <td>${item.isHidden}</td>
            <td><code>${item.role}</code></td>
            <td>${item.name}</td>
            <td class="${statusClass}">${item.status}</td>
            <td>
                <div>${item.msg}</div>
                <div class="suggestion">${item.suggestion}</div>
            </td>
        `;
        
        tr.onclick = () => {
            window.focus();
            item.element.scrollIntoView({behavior: 'auto', block: 'center'});
            item.element.focus();
            const oldOutline = item.element.style.outline;
            item.element.style.outline = '4px solid #bf2600';
            setTimeout(() => { item.element.style.outline = oldOutline; }, 1500);
        };
        
        tbody.appendChild(tr);
    });

    doc.getElementById('table-container').appendChild(table);

})();