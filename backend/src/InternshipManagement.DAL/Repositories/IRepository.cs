namespace InternshipManagement.DAL.Repositories;

/// <summary>Interface CRUD dùng chung — DAL tự khai báo và tự cài đặt (không tách sang tầng riêng).</summary>
public interface IRepository<T> where T : class
{
    Task<T?> GetByIdAsync(string id);
    Task<IReadOnlyList<T>> GetAllAsync();
    Task AddAsync(T entity);
    void Update(T entity);
    void Delete(T entity);
    Task<int> SaveChangesAsync();
}
