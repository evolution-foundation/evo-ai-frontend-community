import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import type { PipelineItem } from '@/types/analytics/pipelines';
import { defaultConfiguration, nativeFields } from './cardConfiguration';
import ConfiguredDealCard from './ConfiguredDealCard';

const item = { id: 'deal', pipeline_id: 'pipeline', title: 'Título muito longo', value: 0, currency: 'BRL', owner: null, custom_fields: { active: false } } as PipelineItem;
describe('configured board and preview renderer', () => {
  it('opens the deal modal from the title and the missing-contact action, with zero value', () => {
    const onOpen = vi.fn();
    render(<MemoryRouter><ConfiguredDealCard item={item} configuration={defaultConfiguration()} definitions={nativeFields} onOpen={onOpen} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', {name:item.title}));
    expect(onOpen).toHaveBeenCalledWith(item);
    expect(screen.getByText(/R\$.*0,00/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name:'Vincular contato'}));
    expect(onOpen).toHaveBeenLastCalledWith(item, 'contacts');
    expect(screen.getByText('Sem responsável')).toBeInTheDocument();
  });
  it('honors density, hides disabled fields and anchors owner to footer regardless of order', () => {
    const config = defaultConfiguration(); config.density = 'compact'; config.fields.find(field=>field.id==='value')!.visible=false;
    const {container}=render(<MemoryRouter><ConfiguredDealCard item={item} configuration={config} definitions={nativeFields} preview /></MemoryRouter>);
    expect(container.querySelector('.compact')).toBeInTheDocument();
    expect(container.querySelector('.deal-value')).toBeNull();
    expect(container.querySelector('.deal-footer')).toHaveTextContent('Sem responsável');
    expect(screen.queryByRole('link')).toBeNull();
  });
  it('renders message content as text and custom false values without interpreting markup', () => {
    const definitions=[...nativeFields,{id:'deal_attribute:active',label:'Ativo',type:'checkbox',source:'deal_attribute'}];
    const config=defaultConfiguration(definitions); config.fields.forEach(field=>{field.visible=true;});
    const unsafe={...item,latest_message:{id:'message',content:'<img src=x onerror=alert(1)>',message_type:'incoming',created_at:'2026-11-11',conversation_id:'c'}};
    const {container}=render(<MemoryRouter><ConfiguredDealCard item={unsafe} configuration={config} definitions={definitions} preview /></MemoryRouter>);
    expect(container.querySelector('img')).toBeNull(); expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument(); expect(screen.getByText('Não')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Ativo:'));
  });
  it('keeps one header photo and title when configurable contact/title fields are hidden', () => {
    const config = defaultConfiguration(); config.fields.forEach(field => { if (['contact', 'title'].includes(field.id)) field.visible = false; });
    const {container} = render(<MemoryRouter><ConfiguredDealCard item={{...item, primary_contact: {id: 'c', name: 'Contato Sintético', avatar_url: '/photo.png'}} as PipelineItem} configuration={config} definitions={nativeFields} /></MemoryRouter>);
    expect(container.querySelector('.deal-card-heading img')).toHaveAttribute('src', '/photo.png');
    expect(container.querySelectorAll('.deal-contact-avatar')).toHaveLength(1);
    expect(screen.getByRole('button', {name: item.title})).toBeInTheDocument();
  });
  it('uses initials for an empty photo URL', () => {
    const {container} = render(<MemoryRouter><ConfiguredDealCard item={{...item, primary_contact: {id: 'c', name: 'Contato Sintético', avatar_url: ' '}} as PipelineItem} configuration={defaultConfiguration()} definitions={nativeFields} /></MemoryRouter>);
    expect(container.querySelector('.deal-card-heading img')).toBeNull();
    expect(container.querySelector('.deal-contact-avatar')).toHaveTextContent('CS');
  });
  it('shows the primary contact photo and initials after load failure, then recovers for a new URL', () => {
    const contact = { id: 'c', name: 'Contato Sintético', avatar_url: '/photo.png' };
    const view = (avatar_url?: string) => <MemoryRouter><ConfiguredDealCard item={{...item, primary_contact: {...contact, avatar_url}} as PipelineItem} configuration={defaultConfiguration()} definitions={nativeFields} /></MemoryRouter>;
    const {container, rerender} = render(view('/photo.png'));
    expect(container.querySelector('.deal-contact-avatar img')).toHaveAttribute('src', '/photo.png');
    fireEvent.error(container.querySelector('.deal-contact-avatar img')!);
    expect(container.querySelector('.deal-contact-avatar')).toHaveTextContent('CS');
    expect(container.querySelector('.deal-contact-avatar img')).toBeNull();
    rerender(view('/new.png'));
    expect(container.querySelector('.deal-contact-avatar img')).toHaveAttribute('src', '/new.png');
  });
  it('uses legacy contact thumbnail and initials when no photo exists', () => {
    const contact = { id: 'legacy', name: 'Lead Sintético', thumbnail: '/thumb.png' };
    const view = (thumbnail?: string) => <MemoryRouter><ConfiguredDealCard item={{...item, contact: {...contact, thumbnail}} as PipelineItem} configuration={defaultConfiguration()} definitions={nativeFields} preview /></MemoryRouter>;
    const {container, rerender} = render(view('/thumb.png'));
    expect(container.querySelector('.deal-contact-avatar img')).toHaveAttribute('src', '/thumb.png');
    rerender(view());
    expect(container.querySelector('.deal-contact-avatar')).toHaveTextContent('LS');
  });

});
