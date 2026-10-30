export const isVisibleToCompany = (candidate) =>
  !candidate?.daDuocTiepNhan || candidate?.tiepNhanTaiDay

export const canApproveCandidate = (candidate) => !candidate?.daKhoaDot && isVisibleToCompany(candidate) && !candidate?.daDuocTiepNhan

export const canRejectCandidate = (candidate) =>
  !candidate?.daKhoaDot && isVisibleToCompany(candidate) && !candidate?.daDuocTiepNhan && !candidate?.coLichPhongVanCho
