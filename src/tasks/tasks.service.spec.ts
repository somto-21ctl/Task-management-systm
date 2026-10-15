import { ProjectsService } from '../projects/projects.service';
import { UsersService } from '../users/users.service';
import { TaskReviewStatus, TaskStatus } from './task.entity';
import { TasksService } from './tasks.service';

describe('TasksService', () => {
  const repository = {
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };
  const projects = { findOneById: jest.fn() };
  const users = {
    findAssignableUser: jest.fn(),
    findAssignableUsers: jest.fn(),
  };
  let service: TasksService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TasksService(
      repository as never,
      projects as unknown as ProjectsService,
      users as unknown as UsersService,
    );
  });

  it('returns filtered, paginated task results', async () => {
    projects.findOneById.mockResolvedValue({
      id: 'project-id',
      owner: { id: 'user-id' },
    });
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

  it('scopes task lookup to its project and hides tasks from non-assignees', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(
      service.findOne('user-id', 'project-id', 'task-id'),
    ).rejects.toThrow('Task not found');
    expect(repository.findOne).toHaveBeenCalledWith({
      where: {
        id: 'task-id',
        project: { id: 'project-id' },
      },
      relations: { project: { owner: true } },
    });
  });

  it('creates tasks for a selected UID in pending status', async () => {
    projects.findOneById.mockResolvedValue({
      id: 'project-id',
      owner: { id: 'manager-id' },
    });
    users.findAssignableUser.mockResolvedValue({ id: 'assignee-id' });
    repository.create.mockImplementation((task) => task);
    repository.save.mockImplementation(async (task) => task);

    await service.create('manager-id', 'project-id', {
      title: 'Build frontend',
      assignedToUserId: 'assignee-id',
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        project: expect.objectContaining({ id: 'project-id' }),
        assignedToUserId: 'assignee-id',
        status: TaskStatus.PENDING,
        reviewStatus: TaskReviewStatus.NOT_REVIEWED,
      }),
    );
  });

  it('allows only the assignee to update only task status', async () => {
    repository.findOne.mockResolvedValue({
      id: 'task-id',
      assignedToUserId: 'assignee-id',
      project: { owner: { id: 'manager-id' } },
    });
    repository.save.mockImplementation(async (task) => task);

    await service.update('assignee-id', 'project-id', 'task-id', {
      status: TaskStatus.IN_PROGRESS,
    });

    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: TaskStatus.IN_PROGRESS,
        reviewStatus: TaskReviewStatus.NOT_REVIEWED,
      }),
    );
  });

  it('returns done work to in_progress when manager requests changes', async () => {
    repository.findOne.mockResolvedValue({
      id: 'task-id',
      status: TaskStatus.DONE,
      project: { owner: { id: 'manager-id' } },
    });
    repository.save.mockImplementation(async (task) => task);

    await service.review('manager-id', 'project-id', 'task-id', {
      reviewStatus: TaskReviewStatus.CHANGES_REQUESTED,
      managerFeedback: 'Please add tests.',
    });

    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: TaskStatus.IN_PROGRESS,
        reviewStatus: TaskReviewStatus.CHANGES_REQUESTED,
        managerFeedback: 'Please add tests.',
        reviewedByUserId: 'manager-id',
        reviewedAt: expect.any(Date),
      }),
    );
  });
});
