import { ProjectsService } from '../projects/projects.service';
import { TaskStatus } from './task.entity';
import { TasksService } from './tasks.service';

describe('TasksService', () => {
  const repository = {
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };
  const projects = { findOneOwned: jest.fn() };
  let service: TasksService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TasksService(
      repository as never,
      projects as unknown as ProjectsService,
    );
  });

  it('returns filtered, paginated task results', async () => {
    projects.findOneOwned.mockResolvedValue({ id: 'project-id' });
    repository.findAndCount.mockResolvedValue([[{ id: 'task-id' }], 1]);

    const result = await service.findPage('user-id', 'project-id', {
      page: 2,
      limit: 10,
      status: TaskStatus.IN_PROGRESS,
      sortDueDate: 'DESC',
    });

    expect(repository.findAndCount).toHaveBeenCalledWith({
      where: { project: { id: 'project-id' }, status: TaskStatus.IN_PROGRESS },
      skip: 10,
      take: 10,
      order: { dueDate: 'DESC', createdAt: 'DESC' },
    });
    expect(result).toEqual({
      items: [{ id: 'task-id' }],
      total: 1,
      page: 2,
      limit: 10,
    });
  });

  it('scopes task lookup to its project and owner', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(
      service.findOne('user-id', 'project-id', 'task-id'),
    ).rejects.toThrow('Task not found');
    expect(repository.findOne).toHaveBeenCalledWith({
      where: {
        id: 'task-id',
        project: { id: 'project-id', owner: { id: 'user-id' } },
      },
    });
  });
});
