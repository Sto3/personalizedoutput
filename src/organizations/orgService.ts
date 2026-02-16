/**
 * Redi for Organizations — Redi learns the org, not just the person
 * ==================================================================
 * An organization is a shared context layer that all members contribute to.
 * When a user who belongs to an organization starts a session, Redi automatically
 * knows the org's projects, culture, team structure, and can reference it naturally.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

async function callAnthropicHaiku(prompt: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) throw new Error(`Haiku call failed: ${response.status}`);
  const data = (await response.json()) as any;
  return data.content?.[0]?.text || '';
}

interface Organization {
  id: string;
  name: string;
  type: 'company' | 'team' | 'family' | 'church' | 'club' | 'school' | 'custom';
  createdBy: string;
  memberIds: string[];
  orgMemory: string;  // Shared organizational knowledge (max 5000 words)
  roles: Record<string, string>;  // userId -> role description
  culture: string;  // How the org communicates, values, norms
  activeProjects: string[];
  sharedCalendar: boolean;
}

// Create a new organization
export async function createOrganization(config: {
  name: string;
  type: Organization['type'];
  createdBy: string;
  description?: string;
}): Promise<string> {
  const supabase = getSupabase();
  const orgId = `org_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

  const { error } = await supabase
    .from('redi_organizations')
    .insert({
      id: orgId,
      name: config.name,
      type: config.type,
      created_by: config.createdBy,
      member_ids: [config.createdBy],
      org_memory: config.description || '',
      roles: { [config.createdBy]: 'admin' },
      culture: '',
      active_projects: [],
      shared_calendar: false,
    });

  if (error) throw error;

  console.log(`[Org] Created organization: ${config.name} (${orgId})`);
  return orgId;
}

// Add a member to the organization
export async function addMember(orgId: string, userId: string, role: string): Promise<void> {
  const supabase = getSupabase();

  const { data: org } = await supabase
    .from('redi_organizations')
    .select('*')
    .eq('id', orgId)
    .single();

  if (!org) throw new Error('Organization not found');

  const memberIds = [...org.member_ids, userId];
  const roles = { ...org.roles, [userId]: role };

  await supabase
    .from('redi_organizations')
    .update({ member_ids: memberIds, roles })
    .eq('id', orgId);
}

// Update org memory after any member's session mentions org-relevant info
export async function updateOrgMemory(orgId: string, newInfo: string): Promise<void> {
  const supabase = getSupabase();

  const { data: org } = await supabase
    .from('redi_organizations')
    .select('org_memory')
    .eq('id', orgId)
    .single();

  if (!org) return;

  // Use Claude Haiku to merge new info into existing org memory
  const mergePrompt = `You are maintaining an organizational knowledge base for an AI assistant.

EXISTING ORG KNOWLEDGE:
${org.org_memory || '(empty)'}

NEW INFORMATION FROM A MEMBER'S SESSION:
${newInfo}

Merge the new information into the existing knowledge. Focus on:
- Team structure and roles
- Active projects and deadlines
- Organizational culture and communication norms
- Shared goals and priorities
- Recurring meetings and events
- Key decisions made
- Important contacts and vendors
- Problems the organization is facing

Keep it under 5000 words. Organize by theme. Mark [NEW] facts.`;

  const merged = await callAnthropicHaiku(mergePrompt);

  await supabase
    .from('redi_organizations')
    .update({ org_memory: merged })
    .eq('id', orgId);
}

// Get org context to inject into a member's session prompt
export async function getOrgContext(userId: string): Promise<string | null> {
  const supabase = getSupabase();

  // Find all orgs this user belongs to
  const { data: orgs } = await supabase
    .from('redi_organizations')
    .select('*')
    .contains('member_ids', [userId]);

  if (!orgs || orgs.length === 0) return null;

  // Build org context string
  return orgs.map(org => {
    const userRole = org.roles?.[userId] || 'member';
    return `ORGANIZATION: ${org.name} (${org.type})
Your role: ${userRole}
${org.culture ? `Culture: ${org.culture}` : ''}
${org.org_memory ? `Knowledge:\n${org.org_memory}` : ''}`;
  }).join('\n\n---\n\n');
}

// Invite system — generate invite code
export async function generateInviteCode(orgId: string): Promise<string> {
  const supabase = getSupabase();
  const code = Math.random().toString(36).substr(2, 8).toUpperCase();

  await supabase
    .from('redi_org_invites')
    .insert({
      code,
      org_id: orgId,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),  // 7 days
    });

  return code;
}

// Join org via invite code
export async function joinWithInviteCode(code: string, userId: string): Promise<string> {
  const supabase = getSupabase();

  const { data: invite } = await supabase
    .from('redi_org_invites')
    .select('*')
    .eq('code', code)
    .gte('expires_at', new Date().toISOString())
    .single();

  if (!invite) throw new Error('Invalid or expired invite code');

  await addMember(invite.org_id, userId, 'member');

  // Delete used invite
  await supabase.from('redi_org_invites').delete().eq('code', code);

  return invite.org_id;
}
