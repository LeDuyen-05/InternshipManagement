namespace InternshipManagement.BLL.DTOs.GioiThieu;

public class CreateGioiThieuDto
{
    public string MaGV { get; set; } = default!;
    public string MaCongTy { get; set; } = default!;
}

public class UpdateTrangThaiGioiThieuDto
{
    public string TrangThaiKetNoi { get; set; } = default!;
}
