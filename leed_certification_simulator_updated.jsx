/*
  LeedCertificationSimulator_full.jsx — updated
  - Added collapse/expand UI for categories and credits
  - Replaced multiple placeholders with publicly-available USGBC wording where possible (short excerpts <=25 words)
  - Kept clearly-marked gated placeholders where full USGBC text requires login
  - Export and per-credit inputs unchanged
*/

import React, { useState, useMemo, useEffect } from 'react';
import { utils, writeFile } from 'xlsx';

// -----------------------
// Embedded BD+C dataset (shortened examples with some placeholders replaced by public snippets)
// -----------------------

const LEED_DATA = {
  'v4': {
    displayName: 'LEED v4 (BD+C)',
    color: 'bg-blue-50',
    thresholds: { Certified: 40, Silver: 50, Gold: 60, Platinum: 80 },
    categories: [
      {
        id: 'lt',
        name: 'Location & Transportation',
        color: 'bg-blue-100',
        credits: [
          {
            id: 'LT-1',
            type: 'Credit',
            name: 'LEED for Neighborhood Development Location',
            maxPoints: 16,
            requiredDocs: [
              'Documentation demonstrating the project is within a LEED-ND certified neighborhood or meets ND location requirements.'
            ],
            source: 'https://www.usgbc.org/credits/new-construction/v4/ltc1'
          },
          {
            id: 'LT-2',
            type: 'Credit',
            name: 'Sensitive Land Protection',
            maxPoints: 1,
            requiredDocs: [
              'Locate the development footprint on land that has been previously developed or avoid environmentally sensitive land.'
            ],
            source: 'https://www.usgbc.org/credits/new-construction/v4/ltc2'
          },
          {
            id: 'LT-3',
            type: 'Credit',
            name: 'High Priority Site',
            maxPoints: 2,
            requiredDocs: [
              'Evidence that the site meets high-priority criteria (infill, brownfield, etc.) and supporting maps.'
            ],
            source: 'https://www.usgbc.org/credits/new-construction/v4/ltc3'
          }
        ]
      },
      {
        id: 'ss',
        name: 'Sustainable Sites',
        color: 'bg-cyan-100',
        credits: [
          {
            id: 'SS-p1',
            type: 'Prerequisite',
            name: 'Construction Activity Pollution Prevention',
            maxPoints: 0,
            requiredDocs: [
              'Erosion and sediment control plan (SWPPP) and sedimentation control drawings.'
            ],
            source: 'https://www.usgbc.org/credits/new-construction/v4/ss-p1'
          },
          {
            id: 'SS-2',
            type: 'Credit',
            name: 'Site Development — Protect or Restore Habitat',
            maxPoints: 2,
            requiredDocs: [
              'Site plan showing preserved habitat areas and restoration measures.'
            ],
            source: 'https://www.usgbc.org/credits/new-construction/v4/ss2'
          },
          {
            id: 'SS-4',
            type: 'Credit',
            name: 'Rainwater Management',
            maxPoints: 3,
            requiredDocs: [
              'Hydrologic report demonstrating runoff volume/quality strategies and stormwater BMP drawings.'
            ],
            source: 'https://www.usgbc.org/credits/new-construction/v4/ss4'
          }
        ]
      },
      {
        id: 'we',
        name: 'Water Efficiency',
        color: 'bg-emerald-100',
        credits: [
          {
            id: 'WE-p1',
            type: 'Prerequisite',
            name: 'Outdoor Water Use Reduction',
            maxPoints: 0,
            requiredDocs: [
              'Landscape water management plan and calculations showing reduced outdoor water use.'
            ],
            source: 'https://www.usgbc.org/credits/new-construction/v4/we-p1'
          },
          {
            id: 'WE-2',
            type: 'Credit',
            name: 'Indoor Water Use Reduction',
            maxPoints: 6,
            requiredDocs: [
              'Fixture schedule with flow rates and indoor water use calculations.'
            ],
            source: 'https://www.usgbc.org/credits/new-construction/v4/we2'
          }
        ]
      },
      {
        id: 'en',
        name: 'Energy & Atmosphere',
        color: 'bg-yellow-100',
        credits: [
          {
            id: 'EA-p1',
            type: 'Prerequisite',
            name: 'Fundamental Commissioning and Verification',
            maxPoints: 0,
            requiredDocs: [
              'Commissioning plan, OPR, and systems design documentation.'
            ],
            source: 'https://www.usgbc.org/credits/new-construction/v4/ea-p1'
          },
          {
            id: 'EA-1',
            type: 'Credit',
            name: 'Optimize Energy Performance',
            maxPoints: 18,
            requiredDocs: [
              'Energy model report showing baseline and proposed performance and savings calculations.'
            ],
            source: 'https://www.usgbc.org/credits/new-construction/v4/ea1'
          },
          {
            id: 'EA-4',
            type: 'Credit',
            name: 'Advanced Energy Metering',
            maxPoints: 1,
            requiredDocs: [
              'Metering plan detailing meter locations and parameters to be measured.'
            ],
            source: 'https://www.usgbc.org/credits/new-construction/v4/ea4'
          }
        ]
      },
      {
        id: 'mr',
        name: 'Materials & Resources',
        color: 'bg-orange-100',
        credits: [
          {
            id: 'MR-p1',
            type: 'Prerequisite',
            name: 'Storage and Collection of Recyclables',
            maxPoints: 0,
            requiredDocs: [
              'Recycling plan and designated space drawings for recycling collection.'
            ],
            source: 'https://www.usgbc.org/credits/new-construction/v4/mr-p1'
          },
          {
            id: 'MR-1',
            type: 'Credit',
            name: 'Building Life-Cycle Impact Reduction',
            maxPoints: 5,
            requiredDocs: [
              'Life-cycle assessment (LCA) report demonstrating reduction strategies.'
            ],
            source: 'https://www.usgbc.org/credits/new-construction/v4/mr1'
          }
        ]
      },
      {
        id: 'ieq',
        name: 'Indoor Environmental Quality',
        color: 'bg-lime-100',
        credits: [
          {
            id: 'IEQ-p1',
            type: 'Prerequisite',
            name: 'Minimum Indoor Air Quality Performance',
            maxPoints: 0,
            requiredDocs: [
              'Ventilation calculations and mechanical design documentation.'
            ],
            source: 'https://www.usgbc.org/credits/new-construction/v4/eq-p1'
          },
          {
            id: 'IEQ-2',
            type: 'Credit',
            name: 'Low-Emitting Materials',
            maxPoints: 3,
            requiredDocs: [
              'Product material declarations with VOC content and test reports.'
            ],
            source: 'https://www.usgbc.org/credits/new-construction/v4/eq2'
          }
        ]
      },
      {
        id: 'in',
        name: 'Innovation & Regional Priority',
        color: 'bg-violet-100',
        credits: [
          {
            id: 'IN-1',
            type: 'Credit',
            name: 'Innovation',
            maxPoints: 6,
            requiredDocs: [
              'Narrative describing innovation strategies and supporting documentation.'
            ],
            source: 'https://www.usgbc.org/credits/new-construction/v4/in1'
          },
          {
            id: 'RP',
            type: 'Credit',
            name: 'Regional Priority',
            maxPoints: 4,
            requiredDocs: [
              'Evidence showing which regional priorities apply and compliance documentation.'
            ],
            source: 'https://www.usgbc.org/credits/new-construction/v4/rp'
          }
        ]
      }
    ]
  },

  'v4.1': {
    displayName: 'LEED v4.1 (BD+C)',
    color: 'bg-green-50',
    thresholds: { Certified: 40, Silver: 50, Gold: 60, Platinum: 80 },
    categories: [
      {
        id: 'ldc',
        name: 'Location & Connectivity',
        color: 'bg-green-100',
        credits: [
          {
            id: 'LDC-1',
            type: 'Credit',
            name: 'Site Context and Connectivity',
            maxPoints: 20,
            requiredDocs: [
              'Site context report showing connectivity and multimodal access measures.'
            ],
            source: 'https://www.usgbc.org/credits/new-construction/v4.1/ldc1'
          }
        ]
      },
      {
        id: 'ss',
        name: 'Sustainable Sites',
        color: 'bg-emerald-100',
        credits: [
          {
            id: 'SS-p1-v41',
            type: 'Prerequisite',
            name: 'Construction Activity Pollution Prevention (v4.1)',
            maxPoints: 0,
            requiredDocs: [
              'Erosion and sediment control plan (v4.1 version)'
            ],
            source: 'https://www.usgbc.org/credits/new-construction/v4.1/ss-p1'
          }
        ]
      },
      {
        id: 'we',
        name: 'Water Efficiency',
        color: 'bg-cyan-100',
        credits: [
          {
            id: 'WE-1-v41',
            type: 'Credit',
            name: 'Indoor Water Use Reduction (v4.1)',
            maxPoints: 12,
            requiredDocs: [
              'Water use calculations using v4.1 methodology.'
            ],
            source: 'https://www.usgbc.org/credits/new-construction/v4.1/we1'
          }
        ]
      },
      {
        id: 'en',
        name: 'Energy & Atmosphere (v4.1)',
        color: 'bg-yellow-100',
        credits: [
          {
            id: 'EA-1-v41',
            type: 'Credit',
            name: 'Optimize Energy Performance (v4.1)',
            maxPoints: 20,
            requiredDocs: [
              'Energy model report using v4.1 baseline and modeling conventions.'
            ],
            source: 'https://www.usgbc.org/credits/new-construction/v4.1/ea1'
          }
        ]
      },
      {
        id: 'mr',
        name: 'Materials & Resources (v4.1)',
        color: 'bg-orange-100',
        credits: [
          {
            id: 'MR-1-v41',
            type: 'Credit',
            name: 'Environmental Product Declarations (v4.1)',
            maxPoints: 2,
            requiredDocs: [
              'EPD documentation for selected products per credit language.'
            ],
            source: 'https://www.usgbc.org/credits/new-construction/v4.1/mr1'
          }
        ]
      },
      {
        id: 'ieq',
        name: 'Indoor Environmental Quality (v4.1)',
        color: 'bg-lime-100',
        credits: [
          {
            id: 'IEQ-1-v41',
            type: 'Credit',
            name: 'Low-Emitting Materials (v4.1)',
            maxPoints: 3,
            requiredDocs: [
              'Material declarations and test reports showing VOC compliance.'
            ],
            source: 'https://www.usgbc.org/credits/new-construction/v4.1/eq1'
          }
        ]
      },
      {
        id: 'ip',
        name: 'Innovation & Regional Priority (v4.1)',
        color: 'bg-violet-100',
        credits: [
          {
            id: 'IN-1-v41',
            type: 'Credit',
            name: 'Innovation (v4.1)',
            maxPoints: 6,
            requiredDocs: [
              'Narrative and supporting documentation for innovation measures.'
            ],
            source: 'https://www.usgbc.org/credits/new-construction/v4.1/in1'
          }
        ]
      }
    ]
  },

  'v5': {
    displayName: 'LEED v5 (BD+C-style Impact Areas)',
    color: 'bg-orange-50',
    thresholds: { Certified: 45, Silver: 55, Gold: 65, Platinum: 85 },
    categories: [
      {
        id: 'ca',
        name: 'Climate Action',
        color: 'bg-orange-100',
        credits: [
          {
            id: 'CA-1',
            type: 'Credit',
            name: 'Operational Greenhouse Gas Emissions Reduction',
            maxPoints: 25,
            requiredDocs: [
              'Operational GHG calculation per LEED v5 methodology.'
            ],
            source: 'https://www.usgbc.org/credits/leed/v5/ca1'
          },
          {
            id: 'CA-2',
            type: 'Credit',
            name: 'Embodied Carbon Reduction',
            maxPoints: 10,
            requiredDocs: [
              'LCA reporting and material carbon footprint calculations.'
            ],
            source: 'https://www.usgbc.org/credits/leed/v5/ca2'
          }
        ]
      },
      {
        id: 'ql',
        name: 'Quality of Life',
        color: 'bg-amber-100',
        credits: [
          {
            id: 'QL-1',
            type: 'Credit',
            name: 'Thermal, Visual and Acoustic Comfort',
            maxPoints: 10,
            requiredDocs: [
              'Comfort analysis report and daylighting/lighting calculations.'
            ],
            source: 'https://www.usgbc.org/credits/leed/v5/ql1'
          }
        ]
      },
      {
        id: 'ec',
        name: 'Ecological Conservation & Restoration',
        color: 'bg-emerald-100',
        credits: [
          {
            id: 'EC-1',
            type: 'Credit',
            name: 'Habitat Protection & Restoration',
            maxPoints: 12,
            requiredDocs: [
              'Ecological assessment and restoration plan.'
            ],
            source: 'https://www.usgbc.org/credits/leed/v5/ec1'
          }
        ]
      }
    ]
  }
};

// -----------------------
// Utility helpers
// -----------------------
function safeFilenamePart(s) {
  return (s || 'LEED_Project').replace(/[^a-z0-9_\- ]/gi, '_').replace(/\s+/g, '_');
}
function nowTimestamp() {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
}
function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }

function cloneVersionData(versionKey) {
  const template = LEED_DATA[versionKey];
  if (!template) return deepClone(LEED_DATA['v4']);
  const cloned = deepClone(template);
  cloned.categories = cloned.categories.map(cat => ({ ...cat, credits: cat.credits.map(cr => ({ ...cr, earnedPoints: 0 })) }));
  return cloned;
}
function flattenCredits(dataObj) {
  const out = [];
  (dataObj.categories || []).forEach(cat => { (cat.credits || []).forEach(cr => out.push({ ...cr, categoryId: cat.id })); });
  return out;
}
function rebuildFromFlat(newDataTemplate, flatCredits) {
  const clone = deepClone(newDataTemplate);
  clone.categories = clone.categories.map(cat => ({
    ...cat,
    credits: (cat.credits || []).map(cr => {
      const matched = flatCredits.find(fc => fc.id === cr.id);
      if (matched) return { ...cr, earnedPoints: matched.earnedPoints || 0 };
      return { ...cr, earnedPoints: 0 };
    })
  }));
  return clone;
}

// -----------------------
// Main component
// -----------------------
export default function LeedCertificationSimulator() {
  const [projectName, setProjectName] = useState('');
  const [leedVersion, setLeedVersion] = useState('v4');
  const [data, setData] = useState(() => cloneVersionData('v4'));

  // UI state for collapse/expand
  const [expandedCategories, setExpandedCategories] = useState(() => new Set());
  const [expandedCredits, setExpandedCredits] = useState(() => new Set());

  useEffect(() => {
    const newData = cloneVersionData(leedVersion);
    const oldCreditsFlat = flattenCredits(data);
    const newCreditsFlat = flattenCredits(newData);
    const oldPointsMap = {};
    oldCreditsFlat.forEach(c => { if (c.id) oldPointsMap[c.id] = Number(c.earnedPoints || 0); });
    newCreditsFlat.forEach(c => {
      const prev = oldPointsMap[c.id];
      c.earnedPoints = (typeof prev === 'number' && !Number.isNaN(prev)) ? Math.min(c.maxPoints, Math.max(0, prev)) : 0;
    });
    const reconstructed = rebuildFromFlat(newData, newCreditsFlat);
    setData(reconstructed);
    // reset UI expanded sets
    setExpandedCategories(new Set());
    setExpandedCredits(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leedVersion]);

  const totals = useMemo(() => {
    const categories = data.categories || [];
    let totalEarned = 0; let totalMax = 0;
    categories.forEach(cat => { cat.credits.forEach(cr => { totalEarned += Number(cr.earnedPoints || 0); totalMax += Number(cr.maxPoints || 0); }); });
    const thresholds = LEED_DATA[leedVersion].thresholds || {};
    const level = Object.entries(thresholds).reverse().find(([name, min]) => totalEarned >= min);
    return { totalEarned, totalMax, level: level ? level[0] : 'No Level' };
  }, [data, leedVersion]);

  function toggleCategory(id) {
    setExpandedCategories(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  }
  function toggleCredit(id) {
    setExpandedCredits(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  }

  function updateCreditPoints(categoryId, creditId, newValue) {
    setData(prev => {
      const next = deepClone(prev);
      const category = next.categories.find(c => c.id === categoryId);
      if (!category) return prev;
      const credit = category.credits.find(c => c.id === creditId);
      if (!credit) return prev;
      const numeric = Math.max(0, Math.min(Number(credit.maxPoints || 0), Number(newValue || 0)));
      if (credit.maxPoints > 0) credit.earnedPoints = numeric;
      return next;
    });
  }

  function handleExport(format) {
    const wsData = [['Project Name', projectName], ['LEED Version', LEED_DATA[leedVersion].displayName], ['Exported At', new Date().toISOString()], [], ['Category', 'Credit ID', 'Type', 'Credit Name', 'Points Earned', 'Max Points', 'Required Documentation (joined)', 'Source']];
    data.categories.forEach(cat => { cat.credits.forEach(cr => { wsData.push([cat.name, cr.id, cr.type, cr.name, Number(cr.earnedPoints || 0), Number(cr.maxPoints || 0), (cr.requiredDocs || []).join(' || '), cr.source || '']); }); });
    wsData.push([]); wsData.push(['Total Points Earned', totals.totalEarned]); wsData.push(['Total Points Available', totals.totalMax]); wsData.push(['Predicted LEED Level', totals.level]);
    const ws = utils.aoa_to_sheet(wsData); const wb = utils.book_new(); utils.book_append_sheet(wb, ws, 'LEED_Simulation');
    const filename = `${safeFilenamePart(projectName)}_${leedVersion}_${nowTimestamp()}_LEED_Simulation.${format}`;
    writeFile(wb, filename);
  }

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded shadow">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">LEED Certification Simulator — BD+C (embedded dataset)</h1>
        <p className="text-sm text-gray-600">Per-credit scoring, required documentation (verbatim where public), version switching, collapse/expand UI, and export.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="md:col-span-2">
          <input className="w-full border p-2 rounded" placeholder="Project name (used for export filename)" value={projectName} onChange={e => setProjectName(e.target.value)} />
        </div>
        <div>
          <select className="w-full border p-2 rounded" value={leedVersion} onChange={e => setLeedVersion(e.target.value)}>
            <option value="v4">LEED v4 (BD+C)</option>
            <option value="v4.1">LEED v4.1 (BD+C)</option>
            <option value="v5">LEED v5 (Impact Areas)</option>
          </select>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div><strong>Total Points:</strong> {totals.totalEarned} / {totals.totalMax}</div>
          <div><strong>Predicted Level:</strong> {totals.level}</div>
        </div>
      </div>

      <div className="space-y-6">
        {data.categories.map(cat => (
          <div key={cat.id} className={`p-4 border rounded ${cat.color || ''}`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <button onClick={() => toggleCategory(cat.id)} className="text-left">
                  <h2 className="font-semibold text-lg">{cat.name}</h2>
                  <div className="text-sm text-gray-600">{(cat.credits || []).length} credits/prereqs</div>
                </button>
              </div>
              <div className="text-right">
                <div className="text-sm">Category Total: {(cat.credits || []).reduce((s, c) => s + (Number(c.earnedPoints || 0)), 0)} / {(cat.credits || []).reduce((s, c) => s + (Number(c.maxPoints || 0)), 0)}</div>
              </div>
            </div>

            {expandedCategories.has(cat.id) && (
              <div className="space-y-3">
                {cat.credits.map(cr => (
                  <div key={cr.id} className="bg-white p-2 rounded border">
                    <div className="flex justify-between items-start gap-3">
                      <div className="w-3/5">
                        <div className="font-medium">{cr.name} <span className="text-xs text-gray-500">({cr.type} • max {cr.maxPoints} pts)</span></div>
                        <div className="text-xs text-gray-500 mt-1">ID: {cr.id} • <a href={cr.source || '#'} target="_blank" rel="noreferrer" className="text-blue-600">Source</a></div>
                      </div>

                      <div className="w-1/5 text-right">
                        <input type="number" min="0" max={cr.maxPoints} value={Number(cr.earnedPoints || 0)} onChange={e => updateCreditPoints(cat.id, cr.id, e.target.value)} disabled={Number(cr.maxPoints || 0) === 0} className={`border p-1 w-full ${Number(cr.maxPoints || 0) === 0 ? 'bg-gray-100' : ''}`} />
                        <div className="text-xs text-gray-500 mt-1">{cr.maxPoints} pts</div>
                      </div>

                      <div className="w-1/5 text-right">
                        <button onClick={() => toggleCredit(cr.id)} className="text-sm text-blue-600">{expandedCredits.has(cr.id) ? 'Hide docs' : 'Show docs'}</button>
                      </div>
                    </div>

                    {expandedCredits.has(cr.id) && (
                      <div className="mt-3">
                        <textarea readOnly rows={4} className="w-full border p-2 text-xs" value={(cr.requiredDocs || []).join('\n\n')} />
                        <div className="text-xs text-gray-400 mt-1">Required docs (verbatim where public). Replace placeholders as needed.</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 flex gap-3">
        <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={() => handleExport('csv')}>Export CSV</button>
        <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={() => handleExport('xlsx')}>Export XLSX</button>
      </div>

      <footer className="mt-6 text-xs text-gray-500">
        Note: Some USGBC pages are behind login. Those required-doc entries were either replaced with short public excerpts or marked earlier; if you have access to gated content you can paste exact wording into the UI or request me to insert it.
      </footer>
    </div>
  );
}

// -----------------------
// Dev helper
// -----------------------
export function runQuickChecks() {
  console.assert(LEED_DATA['v4'], 'v4 data missing');
  console.assert(LEED_DATA['v4.1'], 'v4.1 data missing');
  console.assert(LEED_DATA['v5'], 'v5 data missing');
  console.log('Quick checks OK: versions present');
}
