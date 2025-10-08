console.log("Users frontend javascript file");

$(function () {
    $(".member-status").on("change", function(e) {
        const id = e.target.id;
        const memberStatus = $(`#${id}.member-status`).val();

        //TODO AXIOS
    axios.post("/admin/user/edit", {
        _id:id,
        memberStatus:memberStatus,
    }).then(response => {
        const result = response.data;

        if(result.data) {
            $(".member-status").blur();
        } else alert("User update failed!");
    })
    .catch(err=>{
        console.log(err);
        alert("User update failed");
    })

    });
});