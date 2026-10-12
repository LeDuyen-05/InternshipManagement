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

    public async Task<T?> GetByIdAsync(string id) => await DbSet.FindAsync(id);
    public async Task<IReadOnlyList<T>> GetAllAsync() => await DbSet.AsNoTracking().ToListAsync();
    public async Task AddAsync(T entity) => await DbSet.AddAsync(entity);
    public void Update(T entity) => DbSet.Update(entity);
    public void Delete(T entity) => DbSet.Remove(entity);
    public Task<int> SaveChangesAsync() => Context.SaveChangesAsync();
}
