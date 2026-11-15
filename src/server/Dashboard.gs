/**
 * Dashboard.gs — Mesin analitik Dashboard, Global Multi-Select Filter, 4 KPI, & Recurring Issue.
 */

var TM_Dashboard = (function () {
  function toStrArray(val) {
    if (!val) return [];
    if (Array.isArray(val)) {
      return val.map(function (x) { return TM_Utils.sanitizeText(x); }).filter(Boolean);
    }
    var s = TM_Utils.sanitizeText(val);
    return s ? [s] : [];
  }

  function buildCanonicalOutletResolver(outlets) {
    var map = {};
    for (var i = 0; i < outlets.length; i++) {
      map[outlets[i].OutletID] = outlets[i];
    }
    return function resolve(outletId, fallbackName) {
      var visited = {};
      var curr = map[outletId];
      while (curr && curr.MergedIntoOutletID && !visited[curr.OutletID]) {
        visited[curr.OutletID] = true;
        var next = map[curr.MergedIntoOutletID];
        if (!next) break;
        curr = next;
      }
      if (curr) {
        return {
          OutletID: curr.OutletID,
          OutletCode: curr.OutletCode || '',
          CanonicalName: curr.CanonicalName || fallbackName || curr.OutletID
        };
      }
      return {
        OutletID: outletId || 'UNKNOWN',
        OutletCode: '',
        CanonicalName: fallbackName || outletId || 'Unknown Outlet'
      };
    };
  }

  function getFilterOptions(token) {
    TM_Auth.requireAuth(token);
    var outlets = TM_Db.getAllRecords('Outlets').filter(function (o) {
      return !o.MergedIntoOutletID && o.Status !== TM_CONFIG.STATUS.INACTIVE;
    });
    var users = TM_Db.getAllRecords('Users').filter(function (u) {
      return u.Role === TM_CONFIG.ROLES.TRAINER || u.Role === TM_CONFIG.ROLES.SUPER_ADMIN;
    });
    var ams = TM_Db.getAllRecords('Master_AM');
    var mums = TM_Db.getAllRecords('Master_MUM');
    var categories = TM_Db.getAllRecords('Categories');
    var sections = TM_Db.getAllRecords('Sections');

    return {
      outlets: outlets.map(function (o) {
        return { id: o.OutletID, code: o.OutletCode, name: o.CanonicalName };
      }),
      trainers: users.map(function (u) {
        return { id: u.UserID, name: u.Name, username: u.Username };
      }),
      ams: ams.map(function (a) { return { id: a.AM_ID, name: a.AM_Name, status: a.Status }; }),
      mums: mums.map(function (m) { return { id: m.MUM_ID, name: m.MUM_Name, status: m.Status }; }),
      categories: categories.map(function (c) { return { id: c.CategoryID, name: c.CategoryName, status: c.Status }; }),
      sections: sections.map(function (s) { return { id: s.SectionID, name: s.SectionName, status: s.Status }; })
    };
  }

  function computeDashboardDataset(filters) {
    var f = filters || {};
    var dateFrom = TM_Utils.normalizeDateStr(f.dateFrom) || TM_Utils.sanitizeText(f.dateFrom);
    var dateTo = TM_Utils.normalizeDateStr(f.dateTo) || TM_Utils.sanitizeText(f.dateTo);
    var outletIds = toStrArray(f.outletIds);
    var trainerIds = toStrArray(f.trainerIds);
    var amIds = toStrArray(f.amIds);
    var mumIds = toStrArray(f.mumIds);
    var categoryIds = toStrArray(f.categoryIds);
    var sectionIds = toStrArray(f.sectionIds);
    var hasFindingLevelFilter = categoryIds.length > 0 || sectionIds.length > 0;

    var outlets = TM_Db.getAllRecords('Outlets');
    var resolveCanonical = buildCanonicalOutletResolver(outlets);

    var users = TM_Db.getAllRecords('Users');
    var trainerNameById = {};
    for (var u = 0; u < users.length; u++) {
      trainerNameById[users[u].UserID] = users[u].Name;
    }

    // 1. Ambil seluruh sesi Selesai yang tidak terhapus (Draft & soft-deleted dikeluarkan!)
    var allSessions = TM_Db.getAllRecords('Sessions');
    var candidateSessions = [];
    var sessionMap = {};

    for (var i = 0; i < allSessions.length; i++) {
      var s = allSessions[i];
      if (s.Status !== TM_CONFIG.SESSION_STATUS.SELESAI || s.DeletedAt) continue;
      var sDate = TM_Utils.normalizeDateStr(s.InspectionDate) || String(s.InspectionDate);
      if (dateFrom && sDate < dateFrom) continue;
      if (dateTo && sDate > dateTo) continue;
      if (trainerIds.length > 0 && trainerIds.indexOf(s.TrainerID) === -1) continue;
      if (amIds.length > 0 && amIds.indexOf(s.AM_ID) === -1) continue;
      if (mumIds.length > 0 && mumIds.indexOf(s.MUM_ID) === -1) continue;

      var canonical = resolveCanonical(s.OutletID, s.OutletNameSnapshot);
      if (outletIds.length > 0 && outletIds.indexOf(canonical.OutletID) === -1 && outletIds.indexOf(s.OutletID) === -1) {
        continue;
      }

      var enrichedSession = Object.assign({}, s, {
        CanonicalOutletID: canonical.OutletID,
        CanonicalOutletCode: canonical.OutletCode,
        CanonicalOutletName: canonical.CanonicalName,
        TrainerName: trainerNameById[s.TrainerID] || s.TrainerID
      });
      candidateSessions.push(enrichedSession);
      sessionMap[s.SessionID] = enrichedSession;
    }

    // 2. Ambil seluruh foto aktif
    var allPhotos = TM_Db.getAllRecords('Photos');
    var photosByFinding = {};
    for (var p = 0; p < allPhotos.length; p++) {
      var ph = allPhotos[p];
      if (ph.DeletedAt || ph.PurgedAt || ph.Status !== 'Berhasil') continue;
      if (!photosByFinding[ph.FindingID]) photosByFinding[ph.FindingID] = [];
      photosByFinding[ph.FindingID].push({
        PhotoID: ph.PhotoID,
        FindingID: ph.FindingID,
        SessionID: ph.SessionID,
        DriveFileID: ph.DriveFileID,
        FileName: ph.FileName,
        MimeType: ph.MimeType,
        FileSize: ph.FileSize,
        PhotoComment: ph.PhotoComment,
        Status: ph.Status,
        UploadedAt: ph.UploadedAt
      });
    }

    // 3. Ambil seluruh temuan aktif pada sesi kandidat yang lolos filter Category & Section
    var allFindings = TM_Db.getAllRecords('Findings');
    var matchedFindings = [];
    var findingsBySession = {};

    for (var j = 0; j < allFindings.length; j++) {
      var fnd = allFindings[j];
      if (fnd.DeletedAt) continue;
      var parentSes = sessionMap[fnd.SessionID];
      if (!parentSes) continue;
      if (categoryIds.length > 0 && categoryIds.indexOf(fnd.CategoryID) === -1) continue;
      if (sectionIds.length > 0 && sectionIds.indexOf(fnd.SectionID) === -1) continue;

      var enrichedFnd = Object.assign({}, fnd, {
        InspectionDate: parentSes.InspectionDate,
        ReportNumber: parentSes.ReportNumber,
        CanonicalOutletID: parentSes.CanonicalOutletID,
        CanonicalOutletCode: parentSes.CanonicalOutletCode,
        CanonicalOutletName: parentSes.CanonicalOutletName,
        OutletNameSnapshot: parentSes.OutletNameSnapshot,
        TrainerID: parentSes.TrainerID,
        TrainerName: parentSes.TrainerName,
        AM_ID: parentSes.AM_ID,
        AM_Name_Snapshot: parentSes.AM_Name_Snapshot,
        MUM_ID: parentSes.MUM_ID,
        MUM_Name_Snapshot: parentSes.MUM_Name_Snapshot,
        PIC_Name: parentSes.PIC_Name,
        Photos: photosByFinding[fnd.FindingID] || []
      });

      matchedFindings.push(enrichedFnd);
      if (!findingsBySession[fnd.SessionID]) findingsBySession[fnd.SessionID] = [];
      findingsBySession[fnd.SessionID].push(enrichedFnd);
    }

    // Jika filter Category/Section aktif, sesi yang dihitung adalah sesi yang memiliki minimal 1 temuan cocok;
    // jika tidak aktif, sesi Selesai tanpa temuan tetap dihitung (PRD 7.4 & 22.6).
    var matchedSessions = hasFindingLevelFilter
      ? candidateSessions.filter(function (s) { return Boolean(findingsBySession[s.SessionID]); })
      : candidateSessions;

    // 4. Hitung KPI & Recurring Issue (PRD 10.3 & 10.6)
    var uniqueOutletsMap = {};
    for (var m = 0; m < matchedSessions.length; m++) {
      uniqueOutletsMap[matchedSessions[m].CanonicalOutletID] = true;
    }

    var pairMap = {};
    for (var k = 0; k < matchedFindings.length; k++) {
      var item = matchedFindings[k];
      var pairKey = item.CanonicalOutletID + '::' + item.CategoryID;
      if (!pairMap[pairKey]) {
        pairMap[pairKey] = {
          pairKey: pairKey,
          canonicalOutletId: item.CanonicalOutletID,
          outletCode: item.CanonicalOutletCode,
          outletName: item.CanonicalOutletName,
          categoryId: item.CategoryID,
          categoryName: item.CategoryNameSnapshot,
          sessionsMap: {},
          findingCount: 0,
          lastInspectionDate: item.InspectionDate
        };
      }
      pairMap[pairKey].sessionsMap[item.SessionID] = item.InspectionDate;
      pairMap[pairKey].findingCount++;
      if (String(item.InspectionDate) > String(pairMap[pairKey].lastInspectionDate)) {
        pairMap[pairKey].lastInspectionDate = item.InspectionDate;
      }
    }

    var recurringIssues = [];
    var recurringAffectedOutlets = {};
    var pairKeys = Object.keys(pairMap);
    for (var pk = 0; pk < pairKeys.length; pk++) {
      var entry = pairMap[pairKeys[pk]];
      var sessionIds = Object.keys(entry.sessionsMap);
      // Definisi PRD 10.6: Kategori yang sama ditemukan minimal dalam 2 sesi pemeriksaan berbeda pada Outlet yang sama
      if (sessionIds.length >= 2) {
        recurringAffectedOutlets[entry.canonicalOutletId] = true;
        recurringIssues.push({
          canonicalOutletId: entry.canonicalOutletId,
          outletCode: entry.outletCode,
          outletName: entry.outletName,
          categoryId: entry.categoryId,
          categoryName: entry.categoryName,
          sessionCount: sessionIds.length,
          findingCount: entry.findingCount,
          lastInspectionDate: entry.lastInspectionDate,
          label: 'Perlu perhatian khusus'
        });
      }
    }

    recurringIssues.sort(function (a, b) {
      if (b.sessionCount !== a.sessionCount) return b.sessionCount - a.sessionCount;
      return b.findingCount - a.findingCount;
    });

    var kpi = {
      totalInspections: matchedSessions.length,
      totalActiveFindings: matchedFindings.length,
      inspectedOutlets: Object.keys(uniqueOutletsMap).length,
      recurringIssuesCount: recurringIssues.length,
      recurringAffectedOutletsCount: Object.keys(recurringAffectedOutlets).length
    };

    // 5. Grafik & Analisis (PRD 10.4 & 10.5)
    // 5a. Trend berdasarkan tanggal pemeriksaan
    var trendMap = {};
    for (var sIdx = 0; sIdx < matchedSessions.length; sIdx++) {
      var dStr = matchedSessions[sIdx].InspectionDate;
      if (!trendMap[dStr]) trendMap[dStr] = { date: dStr, sessionCount: 0, findingCount: 0 };
      trendMap[dStr].sessionCount++;
    }
    for (var fIdx = 0; fIdx < matchedFindings.length; fIdx++) {
      var fdStr = matchedFindings[fIdx].InspectionDate;
      if (!trendMap[fdStr]) trendMap[fdStr] = { date: fdStr, sessionCount: 0, findingCount: 0 };
      trendMap[fdStr].findingCount++;
    }
    var trendByDate = Object.keys(trendMap)
      .sort()
      .map(function (d) { return trendMap[d]; });

    // 5b. Top 10 Master Category
    var catAgg = {};
    for (var cIdx = 0; cIdx < matchedFindings.length; cIdx++) {
      var fc = matchedFindings[cIdx];
      if (!catAgg[fc.CategoryID]) {
        catAgg[fc.CategoryID] = {
          categoryId: fc.CategoryID,
          categoryName: fc.CategoryNameSnapshot,
          findingCount: 0,
          sessionsMap: {}
        };
      }
      catAgg[fc.CategoryID].findingCount++;
      catAgg[fc.CategoryID].sessionsMap[fc.SessionID] = true;
    }
    var topCategories = Object.keys(catAgg)
      .map(function (id) {
        return {
          categoryId: catAgg[id].categoryId,
          categoryName: catAgg[id].categoryName,
          findingCount: catAgg[id].findingCount,
          sessionCount: Object.keys(catAgg[id].sessionsMap).length
        };
      })
      .sort(function (a, b) { return b.findingCount - a.findingCount; })
      .slice(0, 10);

    // 5c. Top Section
    var secAgg = {};
    for (var scIdx = 0; scIdx < matchedFindings.length; scIdx++) {
      var fs = matchedFindings[scIdx];
      if (!secAgg[fs.SectionID]) {
        secAgg[fs.SectionID] = {
          sectionId: fs.SectionID,
          sectionName: fs.SectionNameSnapshot,
          findingCount: 0,
          sessionsMap: {}
        };
      }
      secAgg[fs.SectionID].findingCount++;
      secAgg[fs.SectionID].sessionsMap[fs.SessionID] = true;
    }
    var topSections = Object.keys(secAgg)
      .map(function (id) {
        return {
          sectionId: secAgg[id].sectionId,
          sectionName: secAgg[id].sectionName,
          findingCount: secAgg[id].findingCount,
          sessionCount: Object.keys(secAgg[id].sessionsMap).length
        };
      })
      .sort(function (a, b) { return b.findingCount - a.findingCount; });

    // 5d. Analisis Keseluruhan Top Issue (Pasangan Category + Section)
    var comboAgg = {};
    for (var cbIdx = 0; cbIdx < matchedFindings.length; cbIdx++) {
      var fcb = matchedFindings[cbIdx];
      var cbKey = fcb.CategoryID + '::' + fcb.SectionID;
      if (!comboAgg[cbKey]) {
        comboAgg[cbKey] = {
          categoryId: fcb.CategoryID,
          categoryName: fcb.CategoryNameSnapshot,
          sectionId: fcb.SectionID,
          sectionName: fcb.SectionNameSnapshot,
          findingCount: 0,
          sessionsMap: {},
          outletsMap: {}
        };
      }
      comboAgg[cbKey].findingCount++;
      comboAgg[cbKey].sessionsMap[fcb.SessionID] = true;
      comboAgg[cbKey].outletsMap[fcb.CanonicalOutletID] = true;
    }
    var overallTopIssues = Object.keys(comboAgg)
      .map(function (k2) {
        var row = comboAgg[k2];
        return {
          categoryId: row.categoryId,
          categoryName: row.categoryName,
          sectionId: row.sectionId,
          sectionName: row.sectionName,
          findingCount: row.findingCount,
          sessionCount: Object.keys(row.sessionsMap).length,
          outletCount: Object.keys(row.outletsMap).length
        };
      })
      .sort(function (a, b) { return b.findingCount - a.findingCount; });

    // 5e. Top Issue per Outlet
    var outletAgg = {};
    for (var osIdx = 0; osIdx < matchedSessions.length; osIdx++) {
      var ms = matchedSessions[osIdx];
      var oid = ms.CanonicalOutletID;
      if (!outletAgg[oid]) {
        outletAgg[oid] = {
          canonicalOutletId: oid,
          outletCode: ms.CanonicalOutletCode,
          outletName: ms.CanonicalOutletName,
          sessionCount: 0,
          findingCount: 0,
          catCount: {},
          secCount: {}
        };
      }
      outletAgg[oid].sessionCount++;
    }
    for (var ofIdx = 0; ofIdx < matchedFindings.length; ofIdx++) {
      var mf = matchedFindings[ofIdx];
      var oid2 = mf.CanonicalOutletID;
      if (!outletAgg[oid2]) {
        outletAgg[oid2] = {
          canonicalOutletId: oid2,
          outletCode: mf.CanonicalOutletCode,
          outletName: mf.CanonicalOutletName,
          sessionCount: 0,
          findingCount: 0,
          catCount: {},
          secCount: {}
        };
      }
      outletAgg[oid2].findingCount++;
      outletAgg[oid2].catCount[mf.CategoryNameSnapshot] = (outletAgg[oid2].catCount[mf.CategoryNameSnapshot] || 0) + 1;
      outletAgg[oid2].secCount[mf.SectionNameSnapshot] = (outletAgg[oid2].secCount[mf.SectionNameSnapshot] || 0) + 1;
    }

    function pickTopKey(counterObj) {
      var keys = Object.keys(counterObj);
      if (keys.length === 0) return '-';
      keys.sort(function (a, b) { return counterObj[b] - counterObj[a]; });
      return keys[0] + ' (' + counterObj[keys[0]] + ')';
    }

    var topIssuesByOutlet = Object.keys(outletAgg)
      .map(function (oid3) {
        var oRow = outletAgg[oid3];
        return {
          canonicalOutletId: oRow.canonicalOutletId,
          outletCode: oRow.outletCode,
          outletName: oRow.outletName,
          sessionCount: oRow.sessionCount,
          findingCount: oRow.findingCount,
          topCategory: pickTopKey(oRow.catCount),
          topSection: pickTopKey(oRow.secCount)
        };
      })
      .sort(function (a, b) {
        if (b.findingCount !== a.findingCount) return b.findingCount - a.findingCount;
        return b.sessionCount - a.sessionCount;
      });

    // 5f. Analisis berdasarkan AM & MUM
    var amAgg = {};
    var mumAgg = {};
    for (var amIdx = 0; amIdx < matchedSessions.length; amIdx++) {
      var sesRow = matchedSessions[amIdx];
      var aKey = sesRow.AM_ID || 'UNASSIGNED';
      if (!amAgg[aKey]) {
        amAgg[aKey] = { amId: sesRow.AM_ID, amName: sesRow.AM_Name_Snapshot || '-', sessionCount: 0, findingCount: 0, outletsMap: {} };
      }
      amAgg[aKey].sessionCount++;
      amAgg[aKey].outletsMap[sesRow.CanonicalOutletID] = true;

      var mKey = sesRow.MUM_ID || 'UNASSIGNED';
      if (!mumAgg[mKey]) {
        mumAgg[mKey] = { mumId: sesRow.MUM_ID, mumName: sesRow.MUM_Name_Snapshot || '-', sessionCount: 0, findingCount: 0, outletsMap: {} };
      }
      mumAgg[mKey].sessionCount++;
      mumAgg[mKey].outletsMap[sesRow.CanonicalOutletID] = true;
    }
    for (var afIdx = 0; afIdx < matchedFindings.length; afIdx++) {
      var fRow = matchedFindings[afIdx];
      var aKey2 = fRow.AM_ID || 'UNASSIGNED';
      if (amAgg[aKey2]) amAgg[aKey2].findingCount++;
      var mKey2 = fRow.MUM_ID || 'UNASSIGNED';
      if (mumAgg[mKey2]) mumAgg[mKey2].findingCount++;
    }

    var analysisByAM = Object.keys(amAgg).map(function (k3) {
      return {
        amId: amAgg[k3].amId,
        amName: amAgg[k3].amName,
        sessionCount: amAgg[k3].sessionCount,
        findingCount: amAgg[k3].findingCount,
        outletCount: Object.keys(amAgg[k3].outletsMap).length
      };
    }).sort(function (a, b) { return b.findingCount - a.findingCount; });

    var analysisByMUM = Object.keys(mumAgg).map(function (k4) {
      return {
        mumId: mumAgg[k4].mumId,
        mumName: mumAgg[k4].mumName,
        sessionCount: mumAgg[k4].sessionCount,
        findingCount: mumAgg[k4].findingCount,
        outletCount: Object.keys(mumAgg[k4].outletsMap).length
      };
    }).sort(function (a, b) { return b.findingCount - a.findingCount; });

    // 6. Detail Pemeriksaan (Sesi beserta temuan & foto yang lolos filter)
    var detailedSessions = matchedSessions.slice().sort(function (a, b) {
      var cmp = String(b.InspectionDate).localeCompare(String(a.InspectionDate));
      if (cmp !== 0) return cmp;
      return String(b.SubmittedAt).localeCompare(String(a.SubmittedAt));
    }).map(function (sRow) {
      return Object.assign({}, sRow, {
        Findings: findingsBySession[sRow.SessionID] || []
      });
    });

    return {
      kpi: kpi,
      trendByDate: trendByDate,
      topCategories: topCategories,
      topSections: topSections,
      overallTopIssues: overallTopIssues,
      topIssuesByOutlet: topIssuesByOutlet,
      analysisByAM: analysisByAM,
      analysisByMUM: analysisByMUM,
      recurringIssues: recurringIssues,
      detailedSessions: detailedSessions,
      matchedFindings: matchedFindings
    };
  }

  function getDashboardData(token, filters) {
    TM_Auth.requireAuth(token);
    var result = computeDashboardDataset(filters);
    return {
      kpi: result.kpi,
      trendByDate: result.trendByDate,
      topCategories: result.topCategories,
      topSections: result.topSections,
      overallTopIssues: result.overallTopIssues,
      topIssuesByOutlet: result.topIssuesByOutlet,
      analysisByAM: result.analysisByAM,
      analysisByMUM: result.analysisByMUM,
      recurringIssues: result.recurringIssues,
      detailedSessions: result.detailedSessions
    };
  }

  return {
    getFilterOptions: getFilterOptions,
    computeDashboardDataset: computeDashboardDataset,
    getDashboardData: getDashboardData
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TM_Dashboard: TM_Dashboard };
}
