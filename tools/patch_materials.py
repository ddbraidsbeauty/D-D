from pathlib import Path
root=Path(__file__).resolve().parents[1]
path=root/'backend.js'
s=path.read_text()
old="""let materialPrices=[], rc7Installed=false;
      try {materialPrices=await table('ddb_material_prices','professional_id,material_variant_id,discount_unit_amount');rc7Installed=true;}
      catch(e){console.info('RC7 material prices not installed yet');}
      return {catalog,professionals,brand,consent,serviceTags,requirements,serviceAccessories,fieldReqs,materialPrices,rc7Installed,rules:schedule?.rules||[],exceptions:schedule?.exceptions||[],sundays:schedule?.sundays||[]};"""
new="""let materialPrices=[], materialPricesReady=false;
      try {materialPrices=await table('ddb_material_prices','professional_id,material_variant_id,discount_unit_amount');materialPricesReady=true;}
      catch(e){console.info('Cadastro de preços de materiais ainda não instalado');}
      // A tabela de preços NÃO comprova que toda a RC7 foi instalada.
      // Os recursos de remarcação/espera continuam desativados até integração independente.
      const rc7Installed=false;
      return {catalog,professionals,brand,consent,serviceTags,requirements,serviceAccessories,fieldReqs,materialPrices,materialPricesReady,rc7Installed,rules:schedule?.rules||[],exceptions:schedule?.exceptions||[],sundays:schedule?.sundays||[]};"""
assert old in s
s=s.replace(old,new)
needle="""    async saveMaterial(x){ return rpc('admin_save_material',{p_id:x.id||null,p_name:x.name,p_description:x.description||null,p_image_path:x.imagePath||null,p_internal_cost:x.internalCost??0,p_active:x.active!==false,p_variants:x.variants||[]}); },"""
assert needle in s
s=s.replace(needle,needle+"\n"+"    async saveMaterialComplete(x,rules){ return rpc('ddb_save_material_complete',{p_id:x.id||null,p_name:x.name,p_description:x.description||null,p_image_path:x.imagePath||null,p_internal_cost:x.internalCost??0,p_active:x.active!==false,p_variants:x.variants||[],p_rules:rules||[]}); },")
path.write_text(s)
path=root/'src/70-integration.js'
s=path.read_text()
old='state.materialPrices=x.materialPrices||[];state.rc7Installed=!!x.rc7Installed;'
new='state.materialPrices=x.materialPrices||[];state.materialPricesReady=!!x.materialPricesReady;state.rc7Installed=!!x.rc7Installed;'
assert old in s
s=s.replace(old,new)
path.write_text(s)
path=root/'rc7-ui.js'
s=path.read_text()
assert 'const materialPricesReady=!!state.rc7Installed;' in s
s=s.replace('const materialPricesReady=!!state.rc7Installed;','const materialPricesReady=!!state.materialPricesReady;')
path.write_text(s)

path=root/'src/60-admin.js'
s=path.read_text()
start=s.index('function editMaterial(id){')
end=s.index('\nfunction editAccessory(id){',start)
new=r'''function materialOptionValues(form,key){
 const vals=[...form.getAll('opt_'+key),form.get('draft_'+key)];
 const unique=new Set();return vals.map(v=>String(v||'').trim()).filter(value=>{if(!value)return false;const k=value.toLocaleLowerCase('pt-BR');if(unique.has(k))return false;unique.add(k);return true;});
}
function materialVariantCombinations(colors,sizes){
 const out=[];
 if(colors.length&&sizes.length){for(const color of colors)for(const size of sizes)out.push({color,size});}
 else if(colors.length){for(const color of colors)out.push({color,size:null});}
 else if(sizes.length){for(const size of sizes)out.push({color:null,size});}
 return out;
}
function editMaterial(id){
 const db=getState(),m=id?db.materials.find(x=>x.id===id):{id:uid('mat'),name:'',image:'',colors:[],sizes:[],variants:[],compatibility:[],active:true};
 let image=m.image||'';
 openModal(id?'Editar material':'Novo material',`<form id="matForm" class="form"><label>Nome<input name="name" value="${esc(m.name)}" required></label>${uploadField('matImage','Imagem do material',image)}${catalogOptionEditor('materialColors','Cores disponíveis',m.colors)}${catalogOptionEditor('materialSizes','Tamanhos/opções do material',m.sizes)}<fieldset><legend>Variações disponíveis</legend><p class="muted">Marque somente as combinações de cor e tamanho que existem. Desmarcar uma combinação a retira das opções disponíveis sem apagar seu histórico.</p><div id="materialVariantChoices" class="checkgrid"></div></fieldset><label>Valor interno do material (financeiro)<input name="internalCost" type="number" min="0" step="0.01" value="${Number(m.internalCost||0)}"></label>${compatSelector(m.compatibility)}<div id="rc7QuantityEditor" class="rc7-quantity-editor"><p class="muted">Selecione as compatibilidades acima para configurar a quantidade por variação.</p></div><label class="toggle-option"><input name="active" type="checkbox" ${m.active?'checked':''}><span>Ativo</span></label><button class="btn gold">Salvar</button></form>`,root=>{
  bindUpload('matImage',()=>image,v=>image=v);
  bindCatalogOptionEditors(root);
  const knownKeys=new Set(),selectedKeys=new Set();
  const keyOf=v=>JSON.stringify([v.color||null,v.size||null]);
  for(const v of (m.variants||[])){const key=keyOf(v);knownKeys.add(key);if(v.is_active!==false)selectedKeys.add(key);}
  const variantsFromFields=()=>{const f=new FormData($('#matForm',root));return materialVariantCombinations(materialOptionValues(f,'materialColors'),materialOptionValues(f,'materialSizes'));};
  const renderVariants=()=>{const variants=variantsFromFields();const target=$('#materialVariantChoices',root);
    target.innerHTML=variants.length?variants.map(v=>{const key=keyOf(v);if(!knownKeys.has(key)){knownKeys.add(key);selectedKeys.add(key);}return `<label class="toggle-option"><input type="checkbox" data-material-variant="${esc(key)}" ${selectedKeys.has(key)?'checked':''}><span>${esc([v.color,v.size].filter(Boolean).join(' • '))}</span></label>`;}).join(''):'<p class="muted">Adicione ao menos uma cor ou tamanho para definir variantes.</p>';
  };
  $('#materialVariantChoices',root).addEventListener('change',e=>{const input=e.target.closest('[data-material-variant]');if(!input)return;input.checked?selectedKeys.add(input.dataset.materialVariant):selectedKeys.delete(input.dataset.materialVariant);});
  $$('[data-option-editor]',root).forEach(editor=>{editor.addEventListener('input',renderVariants);editor.addEventListener('click',e=>{if(e.target.closest('[data-add-option], [data-remove-option]'))queueMicrotask(renderVariants);});});
  renderVariants();
  const draftQuantities=new Map();
  const updateQty=()=>{ $$('[data-quantity-key]',root).forEach(el=>draftQuantities.set(el.dataset.quantityKey,el.value));const compat=$$('[name="compat"]:checked',root).map(x=>x.value),scopes=adminScopes(compat),old=getState().materialRequirements||[];
   $('#rc7QuantityEditor',root).innerHTML=`<h3>Pacotes necessários por variação</h3><p class="muted">Informe a quantidade para cada compatibilidade selecionada. Uma regra específica de variação substitui a regra geral para o mesmo material.</p>${scopes.map((sc,i)=>{const key=[sc.service_id,sc.method_id,sc.variation_id].filter(Boolean).join('/');const service=getProcedure(sc.service_id),method=getMethod(service,sc.method_id),variation=getVariation(method,sc.variation_id),label=[service?.name,method?.name,variation?.name].filter(Boolean).join(' → ');const rule=old.find(r=>String(r.material_id)===String(m.id)&&String(r.service_id)===String(sc.service_id)&&String(r.method_id||'')===String(sc.method_id||'')&&String(r.variation_id||'')===String(sc.variation_id||''));return `<label> ${esc(label||key)} <input type="number" data-quantity-index="${i}" data-quantity-key="${esc(key)}" min="0.25" step="0.25" value="${esc(draftQuantities.get(key)??rule?.estimated_quantity??'')}" placeholder="Pacotes (obrigatório)"></label>`;}).join('')||'<p class="muted">Selecione um procedimento, método ou variação acima.</p>'}`;
  };
  $$('[name="compat"]',root).forEach(el=>el.addEventListener('change',updateQty));updateQty();
  $('#matForm',root).onsubmit=async e=>{e.preventDefault();
   if(!getState().materialPricesReady)return notify('O cadastro avançado de materiais ainda não está disponível no Supabase. Nenhum material foi alterado.','Configuração pendente');
   const form=e.target,f=new FormData(form);const saveBtn=form.querySelector('button[type="submit"],button.btn.gold');
   try{
    const colors=materialOptionValues(f,'materialColors'),sizes=materialOptionValues(f,'materialSizes');
    const variants=materialVariantCombinations(colors,sizes).filter(v=>selectedKeys.has(keyOf(v)));
    if((colors.length||sizes.length)&&!variants.length)throw Error('Marque pelo menos uma variação disponível, ou remova as opções de cor e tamanho.');
    const compat=$$('[name="compat"]:checked',root).map(x=>x.value),scopes=adminScopes(compat);
    const rules=scopes.map((scope,i)=>({...scope,quantity:Number($(`[data-quantity-index="${i}"]`,root)?.value)}));
    if(rules.some(r=>!Number.isFinite(r.quantity)||r.quantity<=0))throw Error('Configure os pacotes de cada procedimento/variação selecionada.');
    saveBtn.disabled=true;
    const imagePath=await adminAsset(image,'catalog/materials');
    await DDB.saveMaterialComplete({id:id||null,name:f.get('name'),imagePath,internalCost:Number(f.get('internalCost')||0),active:f.has('active'),variants},rules);
    closeModal();await bootstrapBackendPublic();renderModule();notify('Material e quantidades salvos.');
   }catch(err){console.error(err);notify(err.message||'Não foi possível salvar o material.');}
   finally{saveBtn.disabled=false;}
  };
 });
}
'''
s=s[:start]+new+s[end:]
path.write_text(s)
print('patched')
