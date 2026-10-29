using InternshipManagement.DAL;
using Microsoft.EntityFrameworkCore;

namespace InternshipManagement.DAL.Repositories;

public class GenericRepository<T> : IRepository<T> where T : class
{
    protected readonly AppDbContext Context;
    protected readonly DbSet<T> DbSet;

    public GenericRepository(AppDbContext context)
    {
        Context = context;
        DbSet = context.Set<T>();
    }

    public virtual async Task<T?> GetByIdAsync(string id) => await DbSet.FindAsync(id);
    public virtual async Task<IReadOnlyList<T>> GetAllAsync() => await DbSet.AsNoTracking().ToListAsync();
    public virtual async Task AddAsync(T entity) => await DbSet.AddAsync(entity);
    public virtual void Update(T entity) => DbSet.Update(entity);
    public virtual void Delete(T entity) => DbSet.Remove(entity);
    public virtual Task<int> SaveChangesAsync() => Context.SaveChangesAsync();
}
