import withDb from "./src/main/local_db"

async function main(){
    const db = await withDb()

    console.log(  db.get("test").value() )

    await db.update(db => {
        db.test = "xd"

        return db
    })
}

main()