import type { ProductionReport, ProductionSession } from '@/types/api';

type ReportPdfOptions = {
  report: ProductionReport;
  criteria: string;
};

export function buildProductionReportHtml({ report, criteria }: ReportPdfOptions) {
  const sessionDetails = report.sessionDetails ?? report.sessions.map(session => ({
    session,
    durationSeconds: durationBetween(session.startedAt, session.endedAt ?? session.lastRecordAt),
    completionPercentage: session.targetCount ? session.producedCount * 100 / session.targetCount : 0,
    propertyDistribution: {},
  }));

  return `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  @page{size:A4;margin:14mm 12mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#172033;font-size:10px;line-height:1.45;margin:0}
  h1,h2,h3,p{margin:0}.header{border-bottom:3px solid #4f46e5;padding-bottom:12px;margin-bottom:14px}.eyebrow{color:#4f46e5;font-weight:700;letter-spacing:1px;font-size:9px}.title{font-size:24px;color:#1e1b4b;margin-top:3px}.meta{color:#64748b;margin-top:5px}.criteria{background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;padding:9px;margin:12px 0}
  .metrics{display:flex;gap:7px;margin:12px 0 16px}.metric{flex:1;background:#eef2ff;border-radius:8px;padding:10px}.metric b{display:block;font-size:19px;color:#3730a3}.metric span{color:#64748b}
  .section{margin-top:15px}.section-title{font-size:14px;color:#1e1b4b;margin-bottom:7px}.grid{display:flex;gap:10px}.col{flex:1}table{width:100%;border-collapse:collapse}th{background:#eef2ff;color:#312e81;font-weight:700}th,td{border:1px solid #dbe2ee;padding:6px;text-align:left;vertical-align:top}.num{text-align:right;white-space:nowrap}
  .session{page-break-inside:avoid;border:1px solid #cbd5e1;border-radius:9px;margin-top:13px;overflow:hidden}.session-head{background:#f8fafc;padding:10px;border-bottom:1px solid #cbd5e1}.session-title{font-size:14px;color:#1e1b4b}.session-sub{color:#64748b;margin-top:2px}.session-body{padding:10px}.facts{display:flex;gap:6px;margin-bottom:9px}.fact{flex:1;background:#f8fafc;border-radius:6px;padding:7px}.fact strong{display:block;color:#111827;font-size:12px}.fact span{color:#64748b;font-size:8px;text-transform:uppercase}.status{display:inline-block;padding:2px 7px;border-radius:99px;background:#e0e7ff;color:#3730a3;font-weight:700}.empty{color:#94a3b8;font-style:italic}.footer-note{color:#94a3b8;margin-top:16px;font-size:8px}
</style></head><body>
  <header class="header"><div class="eyebrow">ÜRETİM BİLGİSİ KONTROL SİSTEMİ</div><h1 class="title">Detaylı Üretim Raporu</h1><p class="meta">Rapor tarihi: ${dateTime(report.generatedAt)}</p></header>
  <div class="criteria"><b>Rapor kriterleri:</b> ${escapeHtml(criteria || 'Tüm kayıtlar')}</div>
  <div class="metrics"><div class="metric"><b>${report.sessionCount}</b><span>Toplam oturum</span></div><div class="metric"><b>${report.totalProduced}</b><span>Basılan ürün</span></div><div class="metric"><b>${report.completedSessionCount}</b><span>Tamamlanan oturum</span></div><div class="metric"><b>%${formatNumber(report.completionRate)}</b><span>Oturum tamamlanma</span></div></div>
  <section class="section"><h2 class="section-title">Genel üretim dağılımı</h2><div class="grid"><div class="col">${distributionTable('Ürün', report.byProduct)}</div><div class="col">${distributionTable('Makine', report.byMachine)}</div><div class="col">${distributionTable('Operatör', report.byOperator ?? {})}</div></div></section>
  <section class="section"><h2 class="section-title">Oturum bazında üretim detayları</h2>
    ${sessionDetails.length ? sessionDetails.map(detail => sessionBlock(detail.session, detail.durationSeconds, detail.completionPercentage, detail.propertyDistribution)).join('') : '<p class="empty">Seçilen kriterlerde üretim kaydı bulunamadı.</p>'}
  </section>
  <p class="footer-note">Bu rapor, seçilen filtrelerdeki arşivlenmemiş üretim oturumlarından otomatik oluşturulmuştur.</p>
</body></html>`;
}

function sessionBlock(session: ProductionSession, durationSeconds: number, completion: number, properties: Record<string, Record<string, number>>) {
  const propertyRows = Object.entries(properties).flatMap(([property, options]) =>
    Object.entries(options).map(([option, count], index) => `<tr><td>${index === 0 ? escapeHtml(property) : ''}</td><td>${escapeHtml(option)}</td><td class="num">${count}</td><td class="num">%${formatNumber(session.producedCount ? count * 100 / session.producedCount : 0)}</td></tr>`)
  ).join('');
  return `<article class="session"><div class="session-head"><h3 class="session-title">Oturum #${session.id} — ${escapeHtml(session.productCode)} / ${escapeHtml(session.productName)}</h3><p class="session-sub">${escapeHtml(session.machineCode)} / ${escapeHtml(session.machineName)} · ${escapeHtml(session.operatorName)} · <span class="status">${statusLabel(session.status)}</span></p></div><div class="session-body">
    <div class="facts"><div class="fact"><strong>${session.producedCount} / ${session.targetCount}</strong><span>Basılan / hedef</span></div><div class="fact"><strong>%${formatNumber(completion)}</strong><span>Hedef gerçekleşme</span></div><div class="fact"><strong>${formatDuration(durationSeconds)}</strong><span>Oturum süresi</span></div></div>
    <table><tbody><tr><th>Başlangıç</th><td>${dateTime(session.startedAt)}</td><th>Son ürün</th><td>${dateTime(session.lastRecordAt)}</td><th>Bitiş</th><td>${dateTime(session.endedAt)}</td></tr></tbody></table>
    <h3 style="margin:10px 0 5px">Ürün özellik sonuçları</h3>${propertyRows ? `<table><thead><tr><th>Özellik</th><th>Sonuç / seçenek</th><th class="num">Adet</th><th class="num">Oran</th></tr></thead><tbody>${propertyRows}</tbody></table>` : '<p class="empty">Bu oturum için özellik sonucu bulunmuyor.</p>'}
  </div></article>`;
}

function distributionTable(label: string, values: Record<string, number>) {
  const rows = Object.entries(values).map(([name, count]) => `<tr><td>${escapeHtml(name)}</td><td class="num">${count}</td></tr>`).join('');
  return `<table><thead><tr><th>${label}</th><th class="num">Adet</th></tr></thead><tbody>${rows || '<tr><td colspan="2" class="empty">Kayıt yok</td></tr>'}</tbody></table>`;
}

const statusLabel = (status: ProductionSession['status']) => ({ RUNNING: 'Devam ediyor', COMPLETED: 'Tamamlandı', STOPPED: 'Durduruldu' })[status];
const formatNumber = (value: number) => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(value);
const dateTime = (value?: string | null) => value ? new Date(value).toLocaleString('tr-TR') : '—';
const durationBetween = (start: string, end?: string | null) => end ? Math.max(0, (new Date(end).getTime() - new Date(start).getTime()) / 1000) : 0;
const formatDuration = (seconds: number) => {
  const totalMinutes = Math.max(0, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours ? `${hours} sa ${minutes} dk` : `${minutes} dk`;
};
const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]!));
