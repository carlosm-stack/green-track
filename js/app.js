const MAT = {
    carton: { n: "Cartón", p: 10 },
    papel: { n: "Papel", p: 8 },
    plastico: { n: "Plástico", p: 15 },
    vidrio: { n: "Vidrio", p: 6 },
    metal: { n: "Metal / aluminio", p: 25 }
};



const PREM = [
    { n: "Bono gasolina $10.000", c: 500 },
    { n: "Mercado $20.000", c: 900 },
    { n: "Recarga celular $5.000", c: 250 }
];



let db = {
    reqs: [],
    reds: []
};

let me = "";



// Obtener elementos HTML por su ID
const $ = id => document.getElementById(id);

// Escapar caracteres especiales para evitar inyección HTML
const esc = s => String(s).replace(/[&<>"]/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;"
}[c]));

// Formatear fecha y hora
function fmt(d, h) {
    const [y, m, dd] = d.split("-");
    return dd + "/" + m + "/" + y + " a las " + h;
}



// Cargar información guardada
function load() {
    try {
        const d = localStorage.getItem("eco");

        if (d) {
            db = JSON.parse(d);
        }
    } catch (e) {}

    try {
        me = localStorage.getItem("ecoMe") || "";
    } catch (e) {}
}

// Guardar información
function save() {
    try {
        localStorage.setItem("eco", JSON.stringify(db));
        localStorage.setItem("ecoMe", me);
    } catch (e) {}
}



function toast(t) {
    const e = $("toast");

    e.textContent = t;
    e.style.display = "block";

    setTimeout(() => {
        e.style.display = "none";
    }, 3200);
}



// Calcular saldo disponible del usuario
function bal(t) {
    return db.reqs
        .filter(r => r.tel === t && r.est === "recogido")
        .reduce((a, r) => a + r.pts, 0)

        - db.reds
        .filter(r => r.tel === t)
        .reduce((a, r) => a + r.c, 0);
}



$("mat").innerHTML = Object.entries(MAT)
    .map(([k, v]) =>
        `<option value="${k}">${v.n} (${v.p} pts/kg)</option>`
    )
    .join("");


$("dia").min = new Date().toISOString().slice(0, 10);


function est() {
    $("est").textContent = Math.round(
        (parseFloat($("kg").value) || 0) * MAT[$("mat").value].p
    );
}


$("mat").onchange = $("kg").oninput = est;

est();



// Eventos de los botones de navegación
$("tCli").onclick = () => tab(true);
$("tAdm").onclick = () => tab(false);


function tab(c) {
    $("vCli").classList.toggle("hide", !c);
    $("vAdm").classList.toggle("hide", c);

    $("tCli").classList.toggle("on", c);
    $("tAdm").classList.toggle("on", !c);

    render();
}

$("go").onclick = () => {

    const f = $("f");

    if (!f.reportValidity()) return;

    // Obtener información del formulario
    const k = parseFloat($("kg").value);
    const m = $("mat").value;
    const pts = Math.round(k * MAT[m].p);

    const r = {
        id: Date.now(),
        nom: $("nom").value.trim(),
        tel: $("tel").value.trim(),
        mat: m,
        kg: k,
        dir: $("dir").value.trim(),
        dia: $("dia").value,
        hor: $("hor").value,
        pts,
        est: "pendiente",
        msg: ""
    };

  
    db.reqs.unshift(r);

    me = r.tel;

    save();
    render();

    $("res").innerHTML = `
        <p>
            Material: <b>${MAT[m].n}</b>,
            <b>${k} kg</b>
        </p>

        <p>
            Puntos que ganarás:
            <b style="color:var(--pr);font-size:1.3rem">
                ${pts}
            </b>
        </p>

        <p>
            Recogida solicitada:
            <b>${fmt(r.dia, r.hor)}</b>
            <br>
            Dirección: ${esc(r.dir)}
        </p>

        <p class="mu">
            El administrador ya recibió tu pedido y te confirmará por mensaje.
        </p>
    `;

    $("modal").classList.add("on");
};



$("ok").onclick = () => {
    $("modal").classList.remove("on");
};



function redimir(i) {

    const p = PREM[i];


    if (!me) {
        return toast("Primero registra una solicitud con tu celular");
    }

    if (bal(me) < p.c) {
        return toast("Te faltan " + (p.c - bal(me)) + " puntos");
    }

    db.reds.push({
        tel: me,
        n: p.n,
        c: p.c
    });

    save();
    render();

    toast("🎉 Redimiste: " + p.n);
}



function setEst(id, e) {

    const r = db.reqs.find(x => x.id === id);

    r.est = e;

    if (e === "confirmado") {
        r.msg = `Hola ${r.nom}, el ${fmt(r.dia, r.hor)} pasaremos por ${r.dir} a recoger tus ${r.kg} kg de ${MAT[r.mat].n.toLowerCase()}. ¡Gracias por reciclar!`;
    }

   
    if (e === "recogido") {
        r.msg = `Hola ${r.nom}, recogimos tu material. Se acreditaron ${r.pts} puntos a tu cuenta. 🎉`;
    }

    save();
    render();

    toast("Mensaje enviado al cliente");
}



function render() {

    // Mostrar saldo de puntos
    $("bal").textContent = bal(me);

    

    $("cat").innerHTML = PREM.map((p, i) => `
        <div class="item">

            <span>
                ${p.n}
                <span class="tag">${p.c} pts</span>
            </span>

            <button class="btn sm" onclick="redimir(${i})">
                Redimir
            </button>

        </div>
    `).join("");

    

    const mis = db.reqs.filter(r => me && r.tel === me);

    $("mis").innerHTML = mis.length
        ? mis.map(r => `
            <div class="item">

                <div>
                    <b>${MAT[r.mat].n}</b>
                    · ${r.kg} kg
                    · ${r.pts} pts

                    <br>

                    <span class="mu">
                        ${fmt(r.dia, r.hor)}
                    </span>
                </div>

                <span class="tag">${r.est}</span>

                ${r.msg ? `
                    <div class="wa">
                        💬 ${esc(r.msg)}
                    </div>
                ` : ""}

            </div>
        `).join("")

        : '<p class="mu">Aún no tienes solicitudes.</p>';

 

    const pend = db.reqs.filter(
        r => r.est === "pendiente"
    ).length;

    const b = $("bdg");

    b.textContent = pend;
    b.classList.toggle("hide", !pend);



    $("lista").innerHTML = db.reqs.length

        ? db.reqs.map(r => `
            <div class="item">

                <div>
                    <b>${esc(r.nom)}</b>
                    · ${esc(r.tel)}

                    <br>

                    ${r.kg} kg de ${MAT[r.mat].n}
                    (${r.pts} pts)

                    <br>

                    <span class="mu">
                        📍 ${esc(r.dir)}
                        <br>
                        🕒 ${fmt(r.dia, r.hor)}
                    </span>
                </div>

                <div>
                    <span class="tag">${r.est}</span>
                    <br><br>

                    ${r.est === "pendiente" ? `
                        <button
                            class="btn sm"
                            onclick="setEst(${r.id},'confirmado')"
                        >
                            Confirmar y avisar
                        </button>
                    ` : ""}

                    ${r.est === "confirmado" ? `
                        <button
                            class="btn sm"
                            onclick="setEst(${r.id},'recogido')"
                        >
                            Marcar recogido
                        </button>
                    ` : ""}
                </div>

                ${r.msg ? `
                    <div class="wa">
                        💬 Mensaje al cliente: ${esc(r.msg)}
                    </div>
                ` : ""}

            </div>
        `).join("")

        : '<p class="mu">No hay pedidos todavía.</p>';
}



load();

render();
