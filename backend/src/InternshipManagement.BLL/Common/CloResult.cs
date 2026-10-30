using InternshipManagement.DAL.Entities;

namespace InternshipManagement.BLL.Common;

// TongDiem đã lưu có thể là tổng tạm hoặc dữ liệu cũ. Khi đọc phải xét lại rubric/chi tiết.
public record CloResult(decimal Partial, decimal? Total, bool LecturerComplete, bool EnterpriseComplete, bool Complete, string Status)
{
    public string Classification => Complete ? ThangDiem.MoTaXepLoai(Total!.Value) : Status;
    public string Outcome => Complete ? (ThangDiem.QuyDoi(Total!.Value).Dat ? "Đạt" : "Không đạt") : Status;
    public static CloResult Evaluate(IEnumerable<TieuChi> rubric, IEnumerable<ChiTietChamDiem>? details)
    {
        var criteria = rubric.Where(x => x.NhomDanhGia is "GV" or "DN").ToList();
        var scores = (details ?? []).GroupBy(x => x.MaTieuChi).ToDictionary(g => g.Key, g => g.ToList());
        bool Valid(TieuChi c) => scores.TryGetValue(c.MaTieuChi, out var s) && s.Count == 1 && s[0].DiemCham >= 0
            && s[0].DiemCham <= c.DiemToiDa && decimal.Round(s[0].DiemCham, 2) == s[0].DiemCham;
        bool GroupComplete(string group) => criteria.Any(x => x.NhomDanhGia == group) && criteria.Where(x => x.NhomDanhGia == group).All(Valid);
        var partial = criteria.Where(Valid).Sum(x => scores[x.MaTieuChi][0].DiemCham);
        var gv = GroupComplete("GV"); var dn = GroupComplete("DN");
        var complete = gv && dn && criteria.Count == criteria.Select(x => x.MaTieuChi).Distinct().Count();
        var status = criteria.Count == 0 ? "Chưa cấu hình rubric" : !criteria.Any(c => scores.ContainsKey(c.MaTieuChi)) ? "Chưa chấm" : "Chưa đủ điểm";
        return new(partial, complete ? partial : null, gv, dn, complete, complete ? "Đủ điểm" : status);
    }
}
