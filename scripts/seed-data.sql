-- Sample data and additional tags
-- This file contains sample blog posts and additional tags for development and testing

-- Add more tags
INSERT INTO tags (name, slug, description, created_at) VALUES
('JavaScript', 'javascript', 'JavaScript programming language', '2024-01-01 00:00:00'),
('TypeScript', 'typescript', 'TypeScript programming language', '2024-01-01 00:00:00'),
('React', 'react', 'React JavaScript library', '2024-01-01 00:00:00'),
('Vue', 'vue', 'Vue.js framework', '2024-01-01 00:00:00'),
('Node.js', 'nodejs', 'Node.js runtime environment', '2024-01-01 00:00:00'),
('Python', 'python', 'Python programming language', '2024-01-01 00:00:00'),
('Database', 'database', 'Database design and management', '2024-01-01 00:00:00'),
('API', 'api', 'Application Programming Interface', '2024-01-01 00:00:00'),
('DevOps', 'devops', 'Development and operations', '2024-01-01 00:00:00'),
('Cloud', 'cloud', 'Cloud computing and services', '2024-01-01 00:00:00');

-- Insert sample blog posts
INSERT INTO posts (title, slug, excerpt, content, type, status, published_at, created_at, updated_at) VALUES
('Getting Started with Astro', 'getting-started-with-astro', 'Learn how to build fast websites with Astro framework', '# Getting Started with Astro

Astro is a modern static site generator that allows you to build fast websites with your favorite frameworks.

## Why Astro?

Astro provides several benefits:

- **Performance**: Zero JavaScript by default
- **Flexibility**: Use any framework you want
- **Developer Experience**: Great tooling and documentation

## Getting Started

1. Create a new Astro project
2. Add your content
3. Deploy to your favorite platform

Astro makes it easy to build fast, modern websites.', 'article', 'published', '2024-01-15 10:00:00', '2024-01-15 10:00:00', '2024-01-15 10:00:00'),

('Understanding TypeScript Generics', 'understanding-typescript-generics', 'Deep dive into TypeScript generics and their practical applications', '# Understanding TypeScript Generics

TypeScript generics are a powerful feature that allows you to create reusable components.

## What are Generics?

Generics enable you to create functions, classes, and interfaces that work with multiple types while maintaining type safety.

## Basic Example

```typescript
function identity&lt;T&gt;(arg: T): T {
    return arg;
}
```

## Advanced Usage

Generics can be used with:

- Functions
- Classes
- Interfaces
- Type constraints

This makes your code more flexible and reusable.', 'article', 'published', '2024-01-20 14:30:00', '2024-01-20 14:30:00', '2024-01-20 14:30:00'),

('My Programming Learning Journey', 'my-programming-learning-journey', 'Personal insights and experiences from learning programming', '# My Programming Learning Journey

As a programmer, I want to share some experiences and insights from learning programming.

## Fundamentals are Important

No matter what programming language you learn, always value the fundamentals:

- Data structures and algorithms
- Design patterns
- Clean code principles
- Version control

## Learning Strategies

1. **Practice regularly**: Code every day
2. **Build projects**: Apply what you learn
3. **Read code**: Learn from others
4. **Stay curious**: Keep learning new things

## Common Pitfalls

- Don''t rush to learn frameworks before mastering basics
- Don''t copy code without understanding it
- Don''t ignore testing and documentation

Remember, programming is a journey, not a destination.', 'article', 'published', '2024-01-25 16:45:00', '2024-01-25 16:45:00', '2024-01-25 16:45:00'),

('Quick Note: CSS Grid vs Flexbox', 'css-grid-vs-flexbox', 'When to use CSS Grid vs Flexbox for layout', 'CSS Grid is great for 2D layouts, while Flexbox excels at 1D layouts. Use Grid for overall page structure and Flexbox for component-level layouts.', 'note', 'published', '2024-01-10 09:15:00', '2024-01-10 09:15:00', '2024-01-10 09:15:00'),

('Quick Note: Git Best Practices', 'git-best-practices', 'Essential Git practices for better collaboration', 'Always write meaningful commit messages, use feature branches, and keep commits atomic. This makes collaboration much easier.', 'note', 'published', '2024-01-12 11:30:00', '2024-01-12 11:30:00', '2024-01-12 11:30:00'),

('Quick Note: Performance Optimization', 'performance-optimization', 'Key principles for web performance', 'Focus on Core Web Vitals: LCP, FID, and CLS. Optimize images, minimize JavaScript, and use efficient loading strategies.', 'note', 'published', '2024-01-18 13:20:00', '2024-01-18 13:20:00', '2024-01-18 13:20:00');

-- Link posts to tags
INSERT INTO post_tags (post_id, tag_id) VALUES
(1, 1), -- Astro post -> JavaScript
(1, 2), -- Astro post -> TypeScript
(2, 2), -- TypeScript post -> TypeScript
(3, 1), -- Learning post -> JavaScript
(3, 2), -- Learning post -> TypeScript
(4, 1), -- CSS note -> JavaScript (web development)
(5, 9), -- Git note -> DevOps
(6, 1); -- Performance note -> JavaScript (web development)