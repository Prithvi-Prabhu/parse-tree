document.getElementById('inputForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const startSymbol = document.getElementById('startSymbol').value.trim();
    const terminals = document.getElementById('terminals').value.split(',').map(t => t.trim());
    const nonTerminals = document.getElementById('nonTerminals').value.split(',').map(nt => nt.trim());
    const rules = parseRules(document.getElementById('rules').value.trim());
    const inputString = document.getElementById('inputString').value.trim();
  
    generateTree(startSymbol, terminals, nonTerminals, rules, inputString);
  });
  
  function parseRules(rulesText) {
    const rules = {};
    const lines = rulesText.split('\n');
    for (const line of lines) {
      const [left, right] = line.split('->').map(s => s.trim());
      if (!rules[left]) rules[left] = [];
      rules[left].push(...right.split('|').map(r => r.trim()));
    }
    return rules;
  }
  
  function generateTree(startSymbol, terminals, nonTerminals, rules, inputString) {
    const queue = [{ node: startSymbol, path: [startSymbol] }];
    const treeData = { name: startSymbol, children: [] };
    const nodesMap = { [startSymbol]: treeData };
    const sequences = [];
    let successPaths = []; 
    const pathMap = {}; 

    while (queue.length > 0) {
        const { node, path } = queue.shift();

        if (node.length > inputString.length) continue;

        let isCompatible = true;
        for (let i = 0; i < node.length; i++) {
            if (terminals.includes(node[i]) && node[i] !== inputString[i]) {
                isCompatible = false;
            }
        }

        if (node === inputString) {
            successPaths.push(path); 
            sequences.push({ path, success: true });
            pathMap[node] = pathMap[node] || [];
            pathMap[node].push(path);
            break; 
        }

        sequences.push({ path, success: false });

        let isTerminalOnly = true;
        const generatedChildren = new Set();
        for (let i = 0; i < node.length; i++) {
            if (nonTerminals.includes(node[i])) {
                isTerminalOnly = false;
                const expansions = rules[node[i]] || [];
                for (const expansion of expansions) {
                    const newNode = node.slice(0, i) + expansion + node.slice(i + 1);

                    if (generatedChildren.has(newNode)) continue;

                    generatedChildren.add(newNode);
                    const child = { name: newNode, children: [] };
                    nodesMap[node].children.push(child);
                    nodesMap[newNode] = child;
                    queue.push({ node: newNode, path: [...path, newNode] });
                }
                break;
            }
        }

        if (isTerminalOnly && node !== inputString) continue;

        pathMap[node] = pathMap[node] || [];
        pathMap[node].push(path);
    }

    const highlightedNodes = new Set();
    successPaths.forEach(successPath => {
        successPath.forEach(node => highlightedNodes.add(node));
    });

    Object.keys(pathMap).forEach(node => {
        if (pathMap[node].some(p => successPaths.some(sp => sp.includes(node)))) {
            pathMap[node].forEach(path => path.forEach(n => highlightedNodes.add(n)));
        }
    });

    drawTree(treeData, Array.from(highlightedNodes));
    displaySequences(sequences);
}

function drawTree(data, highlightedNodes) {
    const treeContainer = document.getElementById('tree-container');
    const containerWidth = treeContainer.clientWidth;
    const height = calculateTreeHeight(data) * 150;
    const width = calculateTreeWidth(data) * 200;

    const treeLayout = d3.tree().size([width, height - 100]);
    const root = d3.hierarchy(data);
    treeLayout(root);

    d3.select('#tree').selectAll('*').remove();
    const svg = d3.select('#tree').append('svg')
        .attr('width', width)
        .attr('height', height);

    const g = svg.append('g')
        .attr('transform', `translate(${width / 2}, 50)`);

    g.selectAll('.link')
        .data(root.links())
        .enter().append('line')
        .attr('class', 'link')
        .attr('x1', d => d.source.x - width / 2)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x - width / 2)
        .attr('y2', d => d.target.y)
        .attr('stroke', '#aaa');

    const node = g.selectAll('.node')
        .data(root.descendants())
        .enter().append('g')
        .attr('class', 'node')
        .attr('transform', d => `translate(${d.x - width / 2},${d.y})`);

    node.append('circle')
        .attr('r', 30)
        .attr('fill', d => highlightedNodes.includes(d.data.name) ? 'yellow' : 'lightblue')
        .on('click', (event, d) => showFullContent(d.data.name));

    node.append('text')
        .text(d => truncateText(d.data.name, 10))
        .attr('dy', 4)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px');
}

  function truncateText(text, maxLength) {
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  }
  
  function showFullContent(fullText) {
    const modal = document.createElement('div');
    modal.classList.add('modal');
    modal.innerHTML = `
      <div class="modal-content">
        <span class="close-button">&times;</span>
        <p>${fullText}</p>
      </div>
    `;
    document.body.appendChild(modal);
  
    modal.querySelector('.close-button').addEventListener('click', () => modal.remove());
  
    modal.addEventListener('click', (event) => {
      if (event.target === modal) modal.remove();
    });
  }
  
  
  function calculateTreeHeight(data) {
    let maxDepth = 0;
    function traverse(node, depth) {
      maxDepth = Math.max(maxDepth, depth);
      if (node.children) {
        node.children.forEach(child => traverse(child, depth + 1));
      }
    }
    traverse(data, 0);
    return maxDepth + 1;
  }
  
  function calculateTreeWidth(data) {
    let maxWidth = 1;
    function traverse(node, depth) {
      if (!node.children || node.children.length === 0) return;
      maxWidth = Math.max(maxWidth, node.children.length);
      node.children.forEach(child => traverse(child, depth + 1));
    }
    traverse(data, 0);
    return maxWidth;
  }
  
  function displaySequences(sequences) {
    const sequencesDiv = document.getElementById('sequences');
    
    const successfulPaths = sequences.filter(seq => seq.success);
  
    sequencesDiv.innerHTML = successfulPaths.map(seq => 
      `<div style="color: green">${seq.path.join(' -> ')}</div>`
    ).join('');
  
    if (successfulPaths.length === 0) {
      sequencesDiv.innerHTML = `<div style="color: red">No solution found</div>`;
    }
  }
  
  document.getElementById('importSettings').addEventListener('click', () => {
    const fileInput = document.getElementById('fileInput');
    fileInput.click();
  });
  
  document.getElementById('fileInput').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const settings = JSON.parse(e.target.result);
          loadSettings(settings);
        } catch (err) {
          alert('Error al leer el archivo: Formato inválido.');
        }
      };
      reader.readAsText(file);
    }
  });
  
  document.getElementById('exportSettings').addEventListener('click', () => {
    const settings = getCurrentSettings();
    const fileName = prompt("Introduce el nombre del archivo (sin extensión):", "settings");
  
    if (fileName) {
      const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.json`; 
      link.click();
      URL.revokeObjectURL(url);
    } else {
      alert("Exportación cancelada: No se proporcionó un nombre.");
    }
  });
  
  
  function getCurrentSettings() {
    return {
      startSymbol: document.getElementById('startSymbol').value.trim(),
      terminals: document.getElementById('terminals').value.split(',').map(t => t.trim()),
      nonTerminals: document.getElementById('nonTerminals').value.split(',').map(nt => nt.trim()),
      rules: document.getElementById('rules').value.trim(),
      inputString: document.getElementById('inputString').value.trim(),
    };
  }
  
  function loadSettings(settings) {
    document.getElementById('startSymbol').value = settings.startSymbol || '';
    document.getElementById('terminals').value = (settings.terminals || []).join(', ');
    document.getElementById('nonTerminals').value = (settings.nonTerminals || []).join(', ');
    document.getElementById('rules').value = settings.rules || '';
    document.getElementById('inputString').value = settings.inputString || '';
  }
  
  